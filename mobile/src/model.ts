export type Incoming = {
  id: string;
  title: string;
  body: string;
  url: string;
  campaignId: string;
  receivedAt: string;
  openedAt?: string;
  source: "fcm" | "demo";
  state: "foreground" | "background" | "opened";
};
export type RemoteInput = {
  messageId?: string;
  notification?: { title?: string; body?: string };
  data?: Record<string, unknown>;
};
export function normalizeNotification(
  input: RemoteInput,
  state: Incoming["state"],
  source: Incoming["source"] = "fcm",
  now = new Date().toISOString(),
): Incoming {
  const string = (value: unknown) => (typeof value === "string" ? value : "");
  return {
    id:
      input.messageId ||
      `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title:
      input.notification?.title || string(input.data?.title) || "إشعار جديد",
    body: input.notification?.body || string(input.data?.body),
    url: string(input.data?.url),
    campaignId: string(input.data?.campaignId),
    receivedAt: now,
    ...(state === "opened" ? { openedAt: now } : {}),
    source,
    state,
  };
}
export function mergeInbox(inbox: Incoming[], incoming: Incoming): Incoming[] {
  const old = inbox.find((item) => item.id === incoming.id);
  const item = old
    ? {
        ...old,
        ...incoming,
        receivedAt: old.receivedAt,
        openedAt: incoming.openedAt || old.openedAt,
      }
    : incoming;
  return [item, ...inbox.filter((entry) => entry.id !== item.id)].slice(0, 100);
}
export function validateCmsUrl(
  value: string,
  allowDevelopment = false,
): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("أدخل عنوان اللوحة كاملًا، مثل https://cms.example.com");
  }
  const local =
    /^(localhost|127\.0\.0\.1|10\.0\.2\.2|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(
      url.hostname,
    );
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(allowDevelopment && local && url.protocol === "http:"))
  )
    throw new Error(
      "استخدم عنوان HTTPS بدون بيانات دخول أو استعلامات. HTTP مسموح فقط للشبكة المحلية في نسخة التطوير.",
    );
  if (url.pathname !== "/")
    throw new Error("أدخل عنوان خادم اللوحة دون مسار إضافي.");
  return url.origin;
}
export function notificationDestination(
  value: string,
): { type: "campaign"; id: string } | { type: "https"; url: string } | null {
  try {
    const url = new URL(value);
    if (
      url.protocol === "nabdh:" &&
      url.hostname === "campaign" &&
      /^\/[a-zA-Z0-9_-]+$/.test(url.pathname)
    )
      return { type: "campaign", id: url.pathname.slice(1) };
    if (url.protocol === "https:" && !url.username && !url.password)
      return { type: "https", url: url.href };
  } catch {}
  return null;
}
