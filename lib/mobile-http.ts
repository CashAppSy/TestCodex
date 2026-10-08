export async function boundedJson(
  request: Request,
): Promise<Record<string, unknown>> {
  if (Number(request.headers.get("content-length") || 0) > 8192)
    throw new Error("too-large");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("empty");
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 8192) {
        await reader.cancel();
        throw new Error("too-large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new Error("invalid");
  return body;
}
export function mobileCredential(request: Request) {
  return (
    request.headers
      .get("authorization")
      ?.match(/^Bearer ([a-f0-9]{64})$/)?.[1] || ""
  );
}
// A global budget avoids trusting spoofable proxy headers and bounds public pairing work.
let windowStart = Date.now(),
  attempts = 0;
export function pairingRateAllowed(now = Date.now()) {
  if (now - windowStart >= 60000) {
    windowStart = now;
    attempts = 0;
  }
  return ++attempts <= 120;
}
export const privateHeaders = { "Cache-Control": "no-store" };
