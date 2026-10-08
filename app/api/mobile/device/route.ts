import {
  boundedJson,
  mobileCredential,
  privateHeaders,
} from "@/lib/mobile-http";
import {
  disconnectMobileDevice,
  mobileSessionDevice,
  updateMobileToken,
} from "@/lib/store";
export const runtime = "nodejs";
function authorized(request: Request) {
  const credential = mobileCredential(request);
  return mobileSessionDevice(credential) ? credential : null;
}
export async function PUT(request: Request) {
  const credential = authorized(request);
  if (!credential)
    return Response.json(
      { error: "جلسة الجهاز غير صالحة. أعد الربط." },
      { status: 401, headers: privateHeaders },
    );
  try {
    const body = await boundedJson(request);
    if (typeof body.token !== "string") throw new Error("invalid");
    const id = updateMobileToken(credential, body.token);
    return Response.json(
      { ok: true, deviceId: id },
      { headers: privateHeaders },
    );
  } catch (error) {
    return Response.json(
      { error: "تعذر تحديث تسجيل الجهاز. تحقق من الرمز أو أعد الربط." },
      {
        status:
          error instanceof Error && error.message === "too-large" ? 413 : 400,
        headers: privateHeaders,
      },
    );
  }
}
export async function DELETE(request: Request) {
  const credential = authorized(request);
  if (!credential)
    return Response.json(
      { error: "جلسة الجهاز غير صالحة. أعد الربط." },
      { status: 401, headers: privateHeaders },
    );
  disconnectMobileDevice(credential);
  return Response.json({ ok: true }, { headers: privateHeaders });
}
