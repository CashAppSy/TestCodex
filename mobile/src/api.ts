import { validateCmsUrl } from "./model.ts";
import type { Connection } from "./storage";
async function request(
  url: string,
  path: string,
  body: unknown,
  credential?: string,
  method = "POST",
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${url}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(credential ? { Authorization: `Bearer ${credential}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "تعذر الاتصال باللوحة.");
    return result;
  } finally {
    clearTimeout(timeout);
  }
}
export async function pair(
  url: string,
  code: string,
  token: string,
  allowDevelopment = false,
): Promise<Connection> {
  const origin = validateCmsUrl(url, allowDevelopment);
  const result = await request(origin, "/api/mobile/pair", {
    code: code.replace(/\s|-/g, ""),
    token,
    platform: "android",
  });
  if (
    typeof result.credential !== "string" ||
    !/^[a-f0-9]{64}$/.test(result.credential) ||
    !Number.isSafeInteger(result.deviceId) ||
    result.deviceId < 1
  )
    throw new Error("رد الربط غير صالح.");
  return {
    url: origin,
    credential: result.credential,
    deviceId: result.deviceId,
  };
}
export async function refreshDevice(connection: Connection, token: string) {
  await request(
    connection.url,
    "/api/mobile/device",
    { token },
    connection.credential,
    "PUT",
  );
}
export async function disconnectDevice(connection: Connection) {
  await request(
    connection.url,
    "/api/mobile/device",
    {},
    connection.credential,
    "DELETE",
  );
}
