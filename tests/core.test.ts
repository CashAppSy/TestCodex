import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { generateKeyPairSync, verify } from "node:crypto";
process.env.CMS_DB_PATH = join(
  mkdtempSync(join(tmpdir(), "nabdh-unit-")),
  "test.sqlite",
);
const store = await import("../lib/store.ts");
const { dispatchCampaign, sendPush } = await import("../lib/push.ts");
const base = {
  name: "حملة اختبار",
  title: "مرحبًا",
  body: "تحديث جديد",
  segment: "all",
  platform: "all",
  link: "myapp://news",
  scheduled_at: null,
};
test("administrator bootstrap, password verification, and session revocation", () => {
  assert.equal(store.hasAdmin(), false);
  assert.throws(() => store.createAdmin("Admin", "admin@example.com", "short"));
  const admin = store.createAdmin(
    "Admin",
    "admin@example.com",
    "long-test-password",
  );
  assert.throws(() =>
    store.createAdmin("Another", "second@example.com", "long-test-password"),
  );
  assert.equal(store.authenticate("admin@example.com", "wrong"), null);
  assert.equal(
    store.authenticate("ADMIN@example.com", "long-test-password")?.id,
    admin.id,
  );
  const token = store.createSession(admin.id);
  assert.equal(store.sessionAdmin(token)?.id, admin.id);
  store.deleteSession(token);
  assert.equal(store.sessionAdmin(token), null);
});
test("login throttling locks repeated guesses", () => {
  for (let i = 0; i < 10; i++) store.authenticate("admin@example.com", "bad");
  assert.equal(
    store.authenticate("admin@example.com", "long-test-password"),
    null,
  );
});
test("campaign validation, scheduling, update, deletion, and audience filtering", () => {
  store.registerDevice("a".repeat(40), "android", "customers");
  store.registerDevice("b".repeat(40), "ios", "staff");
  store.registerDevice("a".repeat(40), "android", "customers");
  assert.equal(store.listDevices().length, 2);
  assert.equal(
    store.audience({ platform: "android", segment: "customers" }).length,
    1,
  );
  assert.equal(
    store.audience({ platform: "ios", segment: "customers" }).length,
    0,
  );
  assert.throws(() => store.saveCampaign({ ...base, title: "" }));
  assert.throws(() =>
    store.saveCampaign({ ...base, link: "javascript://alert" }),
  );
  assert.throws(() =>
    store.saveCampaign({ ...base, scheduled_at: "2020-01-01" }),
  );
  const id = store.saveCampaign({
    ...base,
    scheduled_at: new Date(Date.now() + 60000).toISOString(),
  });
  assert.equal(store.getCampaign(id)?.status, "scheduled");
  assert.equal(store.dueCampaigns().length, 0);
  store.saveCampaign({ ...base, id });
  assert.equal(store.getCampaign(id)?.status, "draft");
  store.removeCampaign(id);
  assert.equal(store.getCampaign(id), undefined);
  store.unregisterDevice("b".repeat(40));
  assert.equal(store.audience({ platform: "all", segment: "all" }).length, 1);
});
test("dispatch records provider acceptance, deactivates invalid tokens, and prevents duplicates", async () => {
  store.registerDevice("b".repeat(40), "ios", "staff");
  const id = store.saveCampaign(base);
  let calls = 0;
  const send = async (device: import("../lib/store.ts").Device) => {
    calls++;
    return device.platform === "android"
      ? { accepted: true, id: "provider-message-id" }
      : { accepted: false, invalid: true, error: "UNREGISTERED" };
  };
  assert.deepEqual(await dispatchCampaign(id, send), {
    accepted: 1,
    failed: 1,
  });
  assert.equal(store.getCampaign(id)?.status, "partial");
  assert.equal(store.campaignDeliveries(id).length, 2);
  assert.equal(store.audience({ platform: "all", segment: "all" }).length, 1);
  await assert.rejects(dispatchCampaign(id, send));
  assert.equal(calls, 2);
  assert.throws(() => store.saveCampaign({ ...base, id }));
  store.removeCampaign(id);
  assert.ok(store.getCampaign(id));
});
test("unconfigured provider and empty audience never claim a campaign", async () => {
  delete process.env.PUSH_PROVIDER;
  delete process.env.FCM_SERVICE_ACCOUNT_JSON;
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const id = store.saveCampaign({ ...base, segment: "nobody" });
  await assert.rejects(dispatchCampaign(id));
  assert.equal(store.getCampaign(id)?.status, "draft");
  await assert.rejects(dispatchCampaign(id, async () => ({ accepted: true })));
  assert.equal(store.getCampaign(id)?.status, "draft");
});
test("ambiguous provider failure is recorded and never retried automatically", async () => {
  const id = store.saveCampaign(base);
  let attempts = 0;
  await dispatchCampaign(id, async () => {
    attempts++;
    throw new Error("timeout");
  });
  assert.equal(attempts, 1);
  assert.equal(store.getCampaign(id)?.status, "failed");
  assert.match(store.campaignDeliveries(id)[0].error || "", /unknown/);
});
test("Expo adapter sends expected payload and checks provider response without real delivery", async () => {
  const original = globalThis.fetch;
  process.env.PUSH_PROVIDER = "expo";
  try {
    globalThis.fetch = async (_url, init) => {
      const payload = JSON.parse(String(init?.body));
      assert.equal(payload.title, base.title);
      assert.equal(payload.data.url, base.link);
      return Response.json({ data: { status: "ok", id: "expo-ticket" } });
    };
    const c = store.getCampaign(store.saveCampaign(base))!;
    const d = {
      id: 99,
      token: "ExpoPushToken[abcdefghijklmnop]",
      platform: "android",
      segment: "all",
      active: 1,
      created_at: new Date().toISOString(),
    };
    assert.deepEqual(await sendPush(d, c), {
      accepted: true,
      id: "expo-ticket",
    });
    globalThis.fetch = async () =>
      Response.json({
        data: { status: "error", details: { error: "DeviceNotRegistered" } },
      });
    assert.equal((await sendPush(d, c)).invalid, true);
  } finally {
    globalThis.fetch = original;
    delete process.env.PUSH_PROVIDER;
  }
});
test("due scheduled campaign is claimed only once by concurrent dispatchers", async () => {
  const id = store.saveCampaign({
    ...base,
    scheduled_at: new Date(Date.now() + 60000).toISOString(),
  });
  const database = new DatabaseSync(process.env.CMS_DB_PATH!);
  database
    .prepare("UPDATE campaigns SET scheduled_at=? WHERE id=?")
    .run(new Date(Date.now() - 1000).toISOString(), id);
  database.close();
  assert.ok(store.dueCampaigns().some((c) => c.id === id));
  let calls = 0;
  const send = async () => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { accepted: true };
  };
  const results = await Promise.allSettled([
    dispatchCampaign(id, send),
    dispatchCampaign(id, send),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(calls, 1);
  assert.equal(store.getCampaign(id)?.status, "sent");
});
test("FCM adapter signs OAuth assertion and sends notification and deep link payload", async () => {
  const original = globalThis.fetch;
  const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
  process.env.FCM_SERVICE_ACCOUNT_JSON = JSON.stringify({
    project_id: "test-project",
    client_email: "test@test-project.iam.gserviceaccount.com",
    private_key: keys.privateKey.export({ type: "pkcs8", format: "pem" }),
  });
  let calls = 0;
  try {
    globalThis.fetch = async (url, init) => {
      calls++;
      if (String(url).includes("oauth2.googleapis.com")) {
        const assertion = (init?.body as URLSearchParams).get("assertion")!;
        const [header, body, signature] = assertion.split(".");
        assert.equal(
          verify(
            "RSA-SHA256",
            Buffer.from(`${header}.${body}`),
            keys.publicKey,
            Buffer.from(signature, "base64url"),
          ),
          true,
        );
        const claims = JSON.parse(Buffer.from(body, "base64url").toString());
        assert.equal(
          claims.scope,
          "https://www.googleapis.com/auth/firebase.messaging",
        );
        return Response.json({
          access_token: "test-oauth-token",
          expires_in: 3600,
        });
      }
      assert.match(
        String(url),
        /fcm.googleapis.com\/v1\/projects\/test-project\/messages:send/,
      );
      assert.equal(
        (init?.headers as Record<string, string>).Authorization,
        "Bearer test-oauth-token",
      );
      const { message } = JSON.parse(String(init?.body));
      assert.equal(message.notification.title, base.title);
      assert.equal(message.data.url, base.link);
      assert.equal(message.apns.payload.aps.sound, "default");
      return Response.json({
        name: "projects/test-project/messages/test-message",
      });
    };
    const campaign = store.getCampaign(store.saveCampaign(base))!;
    const device = {
      id: 1,
      token: "a".repeat(40),
      platform: "android",
      segment: "all",
      active: 1,
      created_at: new Date().toISOString(),
    };
    assert.equal((await sendPush(device, campaign)).accepted, true);
    assert.equal(calls, 2);
    globalThis.fetch = async () =>
      Response.json(
        { error: { details: [{ errorCode: "UNREGISTERED" }] } },
        { status: 404 },
      );
    assert.equal((await sendPush(device, campaign)).invalid, true);
  } finally {
    globalThis.fetch = original;
    delete process.env.FCM_SERVICE_ACCOUNT_JSON;
  }
});
