import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
process.env.CMS_DB_PATH = join(
  mkdtempSync(join(tmpdir(), "nabdh-pairing-")),
  "test.sqlite",
);
const store = await import("../lib/store.ts");
const { boundedJson, pairingRateAllowed } =
  await import("../lib/mobile-http.ts");
test("pairing codes are single use, new codes revoke old codes, and credentials are device scoped", () => {
  const old = store.createMobilePairingCode();
  const current = store.createMobilePairingCode();
  assert.throws(() =>
    store.pairMobileDevice(old.code, "a".repeat(60), "android"),
  );
  assert.throws(() =>
    store.pairMobileDevice(current.code, "too-short", "android"),
  );
  const first = store.pairMobileDevice(
    current.code.toLowerCase(),
    "a".repeat(60),
    "android",
  );
  assert.equal(first.segment, "test");
  assert.equal(store.mobileSessionDevice(first.credential), first.deviceId);
  assert.throws(() =>
    store.pairMobileDevice(current.code, "b".repeat(60), "android"),
  );
  const second = store.pairMobileDevice(
    store.createMobilePairingCode().code,
    "b".repeat(60),
    "android",
  );
  store.updateMobileToken(first.credential, "c".repeat(60));
  assert.throws(() =>
    store.updateMobileToken(first.credential, "b".repeat(60)),
  );
  assert.equal(
    store.audience({ platform: "android", segment: "test" }).length,
    2,
  );
  store.disconnectMobileDevice(first.credential);
  assert.equal(store.mobileSessionDevice(first.credential), null);
  assert.throws(() =>
    store.updateMobileToken(first.credential, "d".repeat(60)),
  );
  assert.equal(store.mobileSessionDevice(second.credential), second.deviceId);
  assert.equal(
    store.audience({ platform: "android", segment: "test" }).length,
    1,
  );
});
test("expired codes fail, expiry is persisted, and credentials are stored only as hashes", () => {
  const code = store.createMobilePairingCode();
  const db = new DatabaseSync(process.env.CMS_DB_PATH!);
  const row = db
    .prepare("SELECT code_hash FROM mobile_pairing_codes")
    .get() as { code_hash: string };
  assert.notEqual(row.code_hash, code.code);
  db.prepare("UPDATE mobile_pairing_codes SET expires_at=?").run(
    Date.now() - 1,
  );
  assert.throws(() =>
    store.pairMobileDevice(code.code, "e".repeat(60), "android"),
  );
  const result = store.pairMobileDevice(
    store.createMobilePairingCode().code,
    "e".repeat(60),
    "android",
  );
  assert.equal(
    db
      .prepare(
        "SELECT credential_hash FROM mobile_sessions WHERE credential_hash=?",
      )
      .get(result.credential),
    undefined,
  );
  db.prepare("UPDATE mobile_sessions SET expires_at=? WHERE device_id=?").run(
    Date.now() - 1,
    result.deviceId,
  );
  assert.equal(store.mobileSessionDevice(result.credential), null);
  db.close();
});
test("JSON body limit applies to streamed bodies without content-length", async () => {
  await assert.rejects(
    boundedJson(
      new Request("https://cms.example.com/api/mobile/pair", {
        method: "POST",
        body: "x".repeat(9000),
      }),
    ),
    /too-large/,
  );
  await assert.rejects(
    boundedJson(
      new Request("https://cms.example.com/api/mobile/pair", {
        method: "POST",
        body: "[]",
      }),
    ),
  );
  assert.deepEqual(
    await boundedJson(
      new Request("https://cms.example.com/api/mobile/pair", {
        method: "POST",
        body: '{"hello":"world"}',
      }),
    ),
    { hello: "world" },
  );
});
test("public pairing budget is bounded and renews after the window", () => {
  const now = Date.now() + 120000;
  for (let i = 0; i < 120; i++) assert.equal(pairingRateAllowed(now), true);
  assert.equal(pairingRateAllowed(now), false);
  assert.equal(pairingRateAllowed(now + 60001), true);
});
