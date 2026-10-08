import {
  boundedJson,
  pairingRateAllowed,
  privateHeaders,
} from "@/lib/mobile-http";
import { pairMobileDevice } from "@/lib/store";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!pairingRateAllowed())
    return Response.json(
      { error: "طلبات كثيرة. انتظر دقيقة وأعد المحاولة." },
      { status: 429, headers: { ...privateHeaders, "Retry-After": "60" } },
    );
  try {
    const body = await boundedJson(request);
    if (
      typeof body.code !== "string" ||
      typeof body.token !== "string" ||
      body.platform !== "android"
    )
      throw new Error("بيانات الربط غير صالحة.");
    return Response.json(
      pairMobileDevice(body.code, body.token, body.platform),
      { headers: privateHeaders },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error && error.message === "too-large"
            ? "الطلب أكبر من الحد المسموح."
            : "تعذر الربط. تحقق من الرمز وصلاحيته وبيانات الجهاز.",
      },
      {
        status:
          error instanceof Error && error.message === "too-large" ? 413 : 400,
        headers: privateHeaders,
      },
    );
  }
}
