import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pair,
  refreshDevice,
  disconnectDevice,
  listPayments,
  payDemo,
  listNotificationTypes,
  authenticateAccount,
  currentAccount,
} from "../src/api.ts";
test("client pairs without a server API key and subsequent requests use only its device credential", async () => {
  const original = globalThis.fetch;
  const credential = "a".repeat(64);
  const requests: {
    url: string;
    method: string;
    auth?: string;
    body: Record<string, unknown>;
  }[] = [];
  try {
    globalThis.fetch = async (url, init) => {
      requests.push({
        url: String(url),
        method: init?.method || "",
        auth: (init?.headers as Record<string, string>)?.Authorization,
        body: JSON.parse(String(init?.body)),
      });
      assert.ok(init?.signal instanceof AbortSignal);
      return String(url).endsWith("/pair")
        ? Response.json({ credential, deviceId: 7, segment: "test" })
        : Response.json({ ok: true });
    };
    const connection = await pair(
      "https://cms.example.com",
      "ABCD-1234-EF56-7890",
      "fcm-token-".repeat(5),
    );
    assert.equal(requests[0].auth, undefined);
    assert.equal(requests[0].body.code, "ABCD1234EF567890");
    assert.equal(requests[0].body.platform, "android");
    assert.equal(requests[0].body.segment, undefined);
    await refreshDevice(connection, "new-fcm-token-".repeat(5));
    await disconnectDevice(connection);
    assert.equal(requests[1].method, "PUT");
    assert.equal(requests[2].method, "DELETE");
    assert.equal(requests[1].auth, `Bearer ${credential}`);
    assert.equal(requests[2].auth, `Bearer ${credential}`);
  } finally {
    globalThis.fetch = original;
  }
});
test("payment requests use scoped credentials and a stable idempotency ID; reads have no request body", async () => {
  const old = globalThis.fetch;
  const connection = {
    url: "https://cms.example.com",
    credential: "a".repeat(64),
    deviceId: 7,
  };
  const calls: { url: string; init?: RequestInit }[] = [];
  try {
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return Response.json(
        init?.method === "GET" ? [] : { id: "payment-demo" },
      );
    };
    await listPayments(connection, "owned-payment");
    await payDemo(connection, "stable-payment-id", 20000, true);
    await payDemo(connection, "stable-payment-id", 20000, true);
    assert.equal(calls[0].init?.body, undefined);
    assert.equal(
      calls[0].url,
      "https://cms.example.com/api/mobile/payments?id=owned-payment",
    );
    assert.equal(calls[1].init?.body, calls[2].init?.body);
    await payDemo(connection, "topup-event-id", 5000, false, "balance_topup");
    await listNotificationTypes(connection);
    assert.equal(
      JSON.parse(String(calls[3].init?.body)).eventType,
      "balance_topup",
    );
    assert.equal(
      calls[4].url,
      "https://cms.example.com/api/mobile/notification-types",
    );
    assert.equal(calls[4].init?.body, undefined);
    assert.equal(
      JSON.parse(String(calls[1].init?.body)).requestId,
      "stable-payment-id",
    );
    for (const call of calls)
      assert.equal(
        (call.init?.headers as Record<string, string>).Authorization,
        "Bearer " + connection.credential,
      );
  } finally {
    globalThis.fetch = old;
  }
});
test("client rejects malformed pairing responses and surfaces server rejection", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      Response.json({ credential: "not-a-credential", deviceId: 7 });
    await assert.rejects(
      pair("https://cms.example.com", "CODE", "fcm-token"),
      /غير صالح/,
    );
    globalThis.fetch = async () =>
      Response.json({ error: "انتهى رمز الربط" }, { status: 400 });
    await assert.rejects(
      pair("https://cms.example.com", "CODE", "fcm-token"),
      /انتهى رمز الربط/,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("account registration and login return only a device session; passwords are not persisted", async () => {
  const original = globalThis.fetch;
  const requests: {
    url: string;
    method?: string;
    body?: string;
    auth: string | null;
  }[] = [];
  const account = { id: 42, name: "اسم المستخدم", phone: "+963944000111" };
  try {
    globalThis.fetch = async (url, init) => {
      requests.push({
        url: String(url),
        method: init?.method,
        body: init?.body as string | undefined,
        auth: new Headers(init?.headers).get("Authorization"),
      });
      return Response.json(
        String(url).endsWith("/me")
          ? account
          : { deviceId: 15, credential: "b".repeat(64), account },
      );
    };
    const created = await authenticateAccount(
      account.phone,
      "test-password",
      "token_" + "a".repeat(30),
      account.name,
    );
    const logged = await authenticateAccount(
      account.phone,
      "test-password",
      "token_" + "a".repeat(30),
    );
    assert.equal(created.account!.id, account.id);
    assert.equal(logged.account!.phone, account.phone);
    assert.equal("password" in created, false);
    assert.equal("token" in created, false);
    assert.equal(
      requests[0].url,
      "https://testcodex.eng-ali-m-ibrahim.workers.dev/api/mobile/register",
    );
    assert.equal(
      requests[1].url,
      "https://testcodex.eng-ali-m-ibrahim.workers.dev/api/mobile/login",
    );
    assert.equal(JSON.parse(requests[0].body!).name, account.name);
    assert.equal(JSON.parse(requests[1].body!).password, "test-password");
    await currentAccount(logged);
    assert.equal(requests[2].method, "GET");
    assert.equal(requests[2].body, undefined);
    assert.equal(requests[2].auth, `Bearer ${logged.credential}`);
    globalThis.fetch = async () =>
      Response.json({ deviceId: 15, credential: "not-valid", account });
    await assert.rejects(
      () =>
        authenticateAccount(
          account.phone,
          "test-password",
          "token_" + "a".repeat(30),
        ),
      /رد تسجيل الدخول غير صالح/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
