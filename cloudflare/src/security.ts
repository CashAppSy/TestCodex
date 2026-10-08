const encoder = new TextEncoder();
export const hex = (data: ArrayBuffer | Uint8Array) =>
  Array.from(new Uint8Array(data instanceof Uint8Array ? data : data))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
export const random = (size = 32) =>
  hex(crypto.getRandomValues(new Uint8Array(size)));
export async function digest(value: string) {
  return hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}
export function equal(a: string, b: string) {
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return difference === 0;
}
// Workers WebCrypto supports PBKDF2 up to 100,000 iterations.
export async function passwordHash(password: string, salt = random(16)) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: encoder.encode(salt),
      iterations: 100000,
    },
    key,
    256,
  );
  return `${salt}:${hex(bits)}`;
}
export async function readBody(
  request: Request,
): Promise<Record<string, unknown>> {
  if (Number(request.headers.get("content-length") || 0) > 8192)
    throw new HttpError(413, "الطلب أكبر من الحد المسموح.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "الطلب فارغ.");
  let total = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 8192) {
        await reader.cancel();
        throw new HttpError(413, "الطلب أكبر من الحد المسموح.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const data = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const result = JSON.parse(new TextDecoder().decode(data));
    if (!result || Array.isArray(result) || typeof result !== "object")
      throw new Error();
    return result;
  } catch {
    throw new HttpError(400, "بيانات الطلب غير صالحة.");
  }
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function text(
  body: Record<string, unknown>,
  key: string,
  max: number,
  required = true,
) {
  const value = body[key];
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    throw new HttpError(400, `تحقق من حقل ${key}.`);
  return value.trim();
}
export const validToken = (value: string) =>
  /^[A-Za-z0-9:_-]{20,4096}$/.test(value);
