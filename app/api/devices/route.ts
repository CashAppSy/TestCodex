import { timingSafeEqual } from "node:crypto";
import { registerDevice, unregisterDevice } from "@/lib/store";
export const runtime = "nodejs";
function authorize(request: Request) {
  const expected = process.env.CMS_DEVICE_API_KEY;
  if (!expected || expected.length < 32) return false;
  const actual =
    request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  const a = Buffer.from(actual),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
async function handle(request: Request, remove = false) {
  if (
    !process.env.CMS_DEVICE_API_KEY ||
    process.env.CMS_DEVICE_API_KEY.length < 32
  )
    return Response.json(
      { error: "Device API is not configured." },
      { status: 503 },
    );
  if (!authorize(request))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (Number(request.headers.get("content-length") || 0) > 8192)
    return Response.json({ error: "Request too large" }, { status: 413 });
  try {
    const raw = await request.text();
    if (raw.length > 8192)
      return Response.json({ error: "Request too large" }, { status: 413 });
    const data = JSON.parse(raw);
    if (
      typeof data.token !== "string" ||
      data.token.length < 20 ||
      data.token.length > 4096
    )
      throw new Error("Invalid token");
    if (remove) unregisterDevice(data.token);
    else
      registerDevice(
        data.token,
        String(data.platform || ""),
        String(data.segment || "all"),
      );
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Invalid device registration." },
      { status: 400 },
    );
  }
}
export async function POST(request: Request) {
  return handle(request);
}
export async function DELETE(request: Request) {
  return handle(request, true);
}
