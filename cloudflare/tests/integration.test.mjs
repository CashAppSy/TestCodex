import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { generateKeyPairSync, verify, createHash } from "node:crypto";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { chromium, expect } from "@playwright/test";

test("Cloudflare worker uses real D1 transactions and mocked FCM", async (t) => {
  const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const account = {
    project_id: "nabdh-integration-test",
    client_email: "fixture@example.com",
    private_key: keys.privateKey.export({ type: "pkcs8", format: "pem" }),
  };
  let sends = 0,
    dryRuns = 0,
    oauthCalls = 0;
  const paymentMessages = [];
  const bootstrap = "test-only-bootstrap-token-not-a-real-secret";
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        {
          name: "cms",
          modules: true,
          scriptPath: "dist/index.js",
          compatibilityDate: "2026-10-08",
          bindings: {
            BOOTSTRAP_TOKEN: bootstrap,
            ENABLE_PAYMENT_DEMO: "true",
            NOTIFICATION_LOGO_URL: "https://logo.example.test/cash-mobile.png",
            FCM_SERVICE_ACCOUNT_JSON: JSON.stringify(account),
          },
          d1Databases: { DB: "nabdh-test" },
          serviceBindings: {
            ASSETS: async (request) => {
              const name = new URL(request.url).pathname;
              const file = [
                "/",
                "/index.html",
                "/app.js",
                "/styles.css",
                "/cash-mobile.png",
              ].includes(name)
                ? name === "/"
                  ? "index.html"
                  : name.slice(1)
                : "index.html";
              return new Response(await readFile(`web/${file}`), {
                headers: {
                  "Content-Type": file.endsWith(".js")
                    ? "text/javascript"
                    : file.endsWith(".css")
                      ? "text/css"
                      : file.endsWith(".png")
                        ? "image/png"
                        : "text/html",
                },
              });
            },
          },
          outboundService: async (request) => {
            const url = new URL(request.url);
            if (url.hostname === "oauth2.googleapis.com") {
              oauthCalls++;
              const fields = new URLSearchParams(await request.text()),
                jwt = fields.get("assertion");
              const [head, payload, signature] = jwt.split(".");
              assert.equal(
                verify(
                  "RSA-SHA256",
                  Buffer.from(`${head}.${payload}`),
                  keys.publicKey,
                  Buffer.from(signature, "base64url"),
                ),
                true,
              );
              const claim = JSON.parse(Buffer.from(payload, "base64url"));
              assert.equal(
                claim.scope,
                "https://www.googleapis.com/auth/firebase.messaging",
              );
              return Response.json({
                access_token: "mock-oauth-token",
                expires_in: 3600,
              });
            }
            if (url.hostname === "fcm.googleapis.com") {
              assert.equal(
                request.headers.get("authorization"),
                "Bearer mock-oauth-token",
              );
              const body = await request.json();
              if (body.validate_only) {
                dryRuns++;
                return Response.json({ name: "dry-run" });
              }
              sends++;
              if (body.message.data?.source === "event_demo")
                paymentMessages.push(body.message);
              assert.equal(
                body.message.android.notification.image,
                "https://logo.example.test/cash-mobile.png",
              );
              assert.equal(body.message.android.notification.color, "#6b7280");
              if (body.message.token.includes("invalid"))
                return Response.json(
                  { error: { details: [{ errorCode: "UNREGISTERED" }] } },
                  { status: 404 },
                );
              if (body.message.token.includes("ambiguous"))
                return new Response("simulated ambiguous provider response", {
                  status: 502,
                });
              return Response.json({
                name: `projects/nabdh-integration-test/messages/${sends}`,
              });
            }
            throw new Error(
              "Unexpected external request; real network is disabled in tests.",
            );
          },
        },
      ],
    }),
  );
  t.after(() => mf.dispose());
  const db = await mf.getD1Database("DB");
  await db.exec(await readFile("migrations/0001_initial.sql", "utf8"));
  await db.exec(await readFile("migrations/0002_payment_demo.sql", "utf8"));
  await db.exec(
    await readFile(
      "migrations/0003_notification_types_subscribers.sql",
      "utf8",
    ),
  );
  await db.exec(await readFile("migrations/0004_mobile_accounts.sql", "utf8"));
  let cookie = "";
  async function call(path, method = "GET", body, options = {}) {
    const headers = {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(method !== "GET" ? { Origin: "https://local.test" } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    };
    const response = await mf.dispatchFetch("https://local.test/api" + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { response, status: response.status, body: await response.json() };
  }
  await t.test(
    "first administrator requires bootstrap, sessions are protected, CSRF is rejected",
    async () => {
      assert.equal((await call("/status")).body.hasAdmin, false);
      const input = {
        name: "مدير الاختبار",
        email: "admin@example.test",
        password: "test-password-with-12-characters",
        bootstrapToken: "wrong-token",
      };
      assert.equal((await call("/setup", "POST", input)).status, 403);
      const result = await call("/setup", "POST", {
        ...input,
        bootstrapToken: bootstrap,
      });
      assert.equal(result.status, 200);
      const header = result.response.headers.get("set-cookie");
      assert.match(header, /HttpOnly/);
      assert.match(header, /Secure/);
      assert.match(header, /SameSite=Strict/);
      cookie = header.split(";")[0];
      assert.equal(
        (await call("/setup", "POST", { ...input, bootstrapToken: bootstrap }))
          .status,
        409,
      );
      assert.equal(
        (
          await call(
            "/pairing-code",
            "POST",
            {},
            { headers: { Origin: "https://evil.example" } },
          )
        ).status,
        403,
      );
      assert.equal(
        (await call("/admin", "GET", undefined, { headers: { Cookie: "" } }))
          .status,
        401,
      );
      const row = await db.prepare("SELECT password_hash FROM admins").first();
      assert.ok(!row.password_hash.includes(input.password));
    },
  );
  let mobileCredential, deviceId;
  await t.test(
    "pairing is single-use under concurrency; device credentials remain scoped",
    async () => {
      const code = (await call("/pairing-code", "POST", {})).body.code;
      const input = {
        code,
        token: "valid_fcm_token_for_device_one_123456789",
        platform: "android",
      };
      const attempts = await Promise.all([
        call("/mobile/pair", "POST", input),
        call("/mobile/pair", "POST", input),
      ]);
      assert.deepEqual(attempts.map((x) => x.status).sort(), [200, 400]);
      const accepted = attempts.find((x) => x.status === 200).body;
      mobileCredential = accepted.credential;
      deviceId = accepted.deviceId;
      assert.match(mobileCredential, /^[a-f0-9]{64}$/);
      const session = await db
        .prepare("SELECT credential_hash FROM mobile_sessions")
        .first();
      assert.notEqual(session.credential_hash, mobileCredential);
      const headers = { Authorization: "Bearer " + mobileCredential };
      assert.equal(
        (
          await call(
            "/mobile/device",
            "PUT",
            { token: "rotated_fcm_token_for_device_one_123456789" },
            { headers },
          )
        ).status,
        200,
      );
      assert.equal(
        (await call("/mobile/device", "PUT", { token: "x" }, { headers }))
          .status,
        400,
      );
      const devices = (await call("/admin")).body.devices;
      assert.equal(devices[0].segment, "test");
      assert.equal("token" in devices[0], false);
      const expired = (await call("/pairing-code", "POST", {})).body.code;
      await db.prepare("UPDATE mobile_pairing_codes SET expires_at=0").run();
      assert.equal(
        (await call("/mobile/pair", "POST", { ...input, code: expired }))
          .status,
        400,
      );
    },
  );
  const draft = {
    name: "حملة الاختبار",
    title: "مرحبًا",
    body: "رسالة تجريبية",
    platform: "android",
    segment: "test",
    link: "nabdh://campaign/welcome",
    scheduled_at: null,
  };
  await t.test(
    "campaign validation, editing, scheduling, cancellation and empty audience",
    async () => {
      assert.equal(
        (
          await call("/campaigns", "POST", {
            ...draft,
            link: "javascript:alert(1)",
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await call("/campaigns", "POST", {
            ...draft,
            scheduled_at: "2000-01-01",
          })
        ).status,
        400,
      );
      const c = await call("/campaigns", "POST", {
        ...draft,
        segment: "empty",
      });
      assert.equal(
        (await call(`/campaigns/${c.body.id}/send`, "POST", {})).status,
        409,
      );
      assert.equal(
        (
          await call("/campaigns", "POST", {
            ...draft,
            id: c.body.id,
            scheduled_at: new Date(Date.now() + 3600000).toISOString(),
          })
        ).status,
        200,
      );
      assert.equal(
        (await call(`/campaigns/${c.body.id}`, "DELETE")).status,
        200,
      );
    },
  );
  await t.test(
    "Firebase validation is a dry run and JWT signature is valid",
    async () => {
      assert.equal((await call("/firebase/check", "POST", {})).status, 200);
      assert.equal(dryRuns, 1);
      assert.equal(sends, 0);
      assert.equal(oauthCalls, 1);
    },
  );
  await t.test(
    "concurrent sends claim once; provider acceptance is recorded and sent campaign immutable",
    async () => {
      const id = (await call("/campaigns", "POST", draft)).body.id;
      const results = await Promise.all([
        call(`/campaigns/${id}/send`, "POST", {}),
        call(`/campaigns/${id}/send`, "POST", {}),
      ]);
      assert.deepEqual(results.map((x) => x.status).sort(), [202, 409]);
      for (let i = 0; i < 100; i++) {
        if (
          (
            await db
              .prepare("SELECT status FROM campaigns WHERE id=?")
              .bind(id)
              .first()
          ).status === "sent"
        )
          break;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      assert.equal(sends, 1);
      const campaign = await db
        .prepare("SELECT * FROM campaigns WHERE id=?")
        .bind(id)
        .first();
      assert.equal(campaign.accepted, 1);
      assert.equal(campaign.status, "sent");
      assert.equal(
        (await call("/campaigns", "POST", { ...draft, id })).status,
        409,
      );
      assert.equal((await call(`/campaigns/${id}`, "DELETE")).status, 409);
      const originalDeliveries = (
        await db
          .prepare("SELECT * FROM deliveries WHERE campaign_id=?")
          .bind(id)
          .all()
      ).results;
      const copy = await call(`/campaigns/${id}/duplicate`, "POST", {});
      assert.equal(copy.status, 201);
      assert.notEqual(copy.body.id, id);
      for (const key of ["title", "body", "platform", "segment", "link"])
        assert.equal(copy.body[key], campaign[key]);
      assert.equal(copy.body.status, "draft");
      assert.equal(copy.body.scheduled_at, null);
      assert.equal(copy.body.accepted, 0);
      assert.equal(copy.body.failed, 0);
      assert.equal(sends, 1, "creating a resend draft must not send messages");
      assert.equal(
        (await call(`/campaigns/${copy.body.id}/duplicate`, "POST", {})).status,
        409,
      );
      assert.equal(
        (await call("/campaigns/999999/duplicate", "POST", {})).status,
        409,
      );
      const resend = await Promise.all([
        call(`/campaigns/${copy.body.id}/send`, "POST", {}),
        call(`/campaigns/${copy.body.id}/send`, "POST", {}),
      ]);
      assert.deepEqual(resend.map((x) => x.status).sort(), [202, 409]);
      for (let i = 0; i < 100; i++) {
        if (
          (
            await db
              .prepare("SELECT status FROM campaigns WHERE id=?")
              .bind(copy.body.id)
              .first()
          ).status === "sent"
        )
          break;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      assert.equal(sends, 2);
      const retried = await db
        .prepare("SELECT * FROM campaigns WHERE id=?")
        .bind(copy.body.id)
        .first();
      assert.equal(retried.status, "sent");
      assert.equal(retried.accepted, 1);
      assert.deepEqual(
        await db.prepare("SELECT * FROM campaigns WHERE id=?").bind(id).first(),
        campaign,
      );
      assert.deepEqual(
        (
          await db
            .prepare("SELECT * FROM deliveries WHERE campaign_id=?")
            .bind(id)
            .all()
        ).results,
        originalDeliveries,
      );
    },
  );
  await t.test(
    "scheduled campaigns resume in bounded batches; invalid tokens and unknown outcomes are not retried",
    async () => {
      for (let i = 0; i < 7; i++) {
        const marker = i === 5 ? "invalid" : i === 6 ? "ambiguous" : "valid";
        await db
          .prepare(
            "INSERT INTO devices(token,platform,segment,created_at) VALUES(?,'android','batch-test',?)",
          )
          .bind(
            `${marker}_scheduled_fixture_token_${i}_1234567890`,
            new Date().toISOString(),
          )
          .run();
      }
      const id = (
        await call("/campaigns", "POST", {
          ...draft,
          segment: "batch-test",
          scheduled_at: new Date(Date.now() + 60000).toISOString(),
        })
      ).body.id;
      await db
        .prepare("UPDATE campaigns SET scheduled_at=? WHERE id=?")
        .bind("2000-01-01T00:00:00.000Z", id)
        .run();
      const worker = await mf.getWorker("cms");
      const before = sends;
      await worker.scheduled({ cron: "* * * * *", scheduledTime: Date.now() });
      assert.equal(sends - before, 5);
      assert.equal(
        (
          await db
            .prepare("SELECT status FROM campaigns WHERE id=?")
            .bind(id)
            .first()
        ).status,
        "sending",
      );
      await worker.scheduled({ cron: "* * * * *", scheduledTime: Date.now() });
      assert.equal(sends - before, 7);
      const campaign = await db
        .prepare("SELECT * FROM campaigns WHERE id=?")
        .bind(id)
        .first();
      assert.equal(campaign.status, "sent");
      assert.equal(campaign.accepted, 5);
      assert.equal(campaign.failed, 2);
      assert.equal(
        (
          await db
            .prepare(
              "SELECT COUNT(*) AS count FROM devices WHERE token LIKE 'invalid_%' AND active=0",
            )
            .first()
        ).count,
        1,
      );
      assert.equal(
        (
          await db
            .prepare(
              "SELECT COUNT(*) AS count FROM deliveries WHERE campaign_id=? AND status='unknown'",
            )
            .bind(id)
            .first()
        ).count,
        1,
      );
      await worker.scheduled({ cron: "* * * * *", scheduledTime: Date.now() });
      assert.equal(sends - before, 7);
    },
  );
  await t.test(
    "payment demo is device-scoped, idempotent under concurrency and sends immediate or delayed notifications once",
    async () => {
      const headers = { Authorization: "Bearer " + mobileCredential };
      assert.equal(
        (
          await call("/mobile/payments", "POST", {
            requestId: "demo-payment-no-auth",
            amount: 20000,
          })
        ).status,
        401,
      );
      const request = {
        requestId: "demo-payment-concurrent",
        amount: 20000,
        deviceId: 99999,
      };
      const before = paymentMessages.length;
      const results = await Promise.all([
        call("/mobile/payments", "POST", request, { headers }),
        call("/mobile/payments", "POST", request, { headers }),
      ]);
      assert.deepEqual(
        results.map((r) => r.status),
        [200, 200],
      );
      assert.equal(results[0].body.id, results[1].body.id);
      await expect
        .poll(
          async () =>
            (
              await db
                .prepare(
                  "SELECT notification_status FROM demo_payments WHERE id=?",
                )
                .bind(results[0].body.id)
                .first()
            ).notification_status,
        )
        .toBe("accepted");
      assert.equal(paymentMessages.length, before + 1);
      assert.equal(
        paymentMessages.at(-1).token,
        (
          await db
            .prepare("SELECT token FROM devices WHERE id=?")
            .bind(deviceId)
            .first()
        ).token,
      );
      assert.equal(
        paymentMessages.at(-1).data.url,
        `nabdh://payment/${results[0].body.id}`,
      );
      assert.equal(
        (await call("/mobile/payments", "POST", request, { headers })).body.id,
        results[0].body.id,
      );
      assert.equal(paymentMessages.length, before + 1);
      assert.equal(
        (
          await call(
            "/mobile/payments",
            "POST",
            { ...request, amount: 30000 },
            { headers },
          )
        ).status,
        409,
      );
      const other = "b".repeat(64);
      const otherId = (
        await db
          .prepare(
            "INSERT INTO devices(token,platform,segment,active,created_at) VALUES(?,'android','test',1,?) RETURNING id",
          )
          .bind(
            "valid_other_payment_device_token_1234567890",
            new Date().toISOString(),
          )
          .first()
      ).id;
      await db
        .prepare(
          "INSERT INTO mobile_sessions(credential_hash,device_id,expires_at) VALUES(?,?,?)",
        )
        .bind(
          createHash("sha256").update(other).digest("hex"),
          otherId,
          Date.now() + 600000,
        )
        .run();
      // Another valid device cannot read this payment, regardless of its ID.
      assert.deepEqual(
        (
          await call(
            `/mobile/payments?id=${results[0].body.id}`,
            "GET",
            undefined,
            { headers: { Authorization: "Bearer " + other } },
          )
        ).body,
        [],
      );
      const delayed = {
        requestId: "demo-payment-delayed",
        amount: 5000,
        delayed: true,
      };
      const row = (await call("/mobile/payments", "POST", delayed, { headers }))
        .body;
      assert.equal(row.notification_status, "pending");
      const due = (
        await db
          .prepare("SELECT notify_after FROM demo_payments WHERE id=?")
          .bind(row.id)
          .first()
      ).notify_after;
      await call(
        "/mobile/payments",
        "POST",
        { ...delayed, delayed: false },
        { headers },
      );
      assert.equal(
        (
          await db
            .prepare("SELECT notify_after FROM demo_payments WHERE id=?")
            .bind(row.id)
            .first()
        ).notify_after,
        due,
      );
      assert.equal(paymentMessages.length, before + 1);
      await db
        .prepare("UPDATE demo_payments SET notify_after=0 WHERE id=?")
        .bind(row.id)
        .run();
      await (
        await mf.getWorker("cms")
      ).scheduled({ cron: "* * * * *", scheduledTime: Date.now() });
      assert.equal(paymentMessages.length, before + 2);
      assert.equal(
        (
          await call(`/mobile/payments?id=${row.id}`, "GET", undefined, {
            headers,
          })
        ).body[0].notification_status,
        "accepted",
      );
    },
  );
  await t.test(
    "subscriber campaigns target only selected users and preserve that audience on resend",
    async () => {
      assert.equal(
        (
          await call(
            "/subscribers",
            "POST",
            { reference: "S001", name: "علي" },
            { headers: { Cookie: "" } },
          )
        ).status,
        401,
      );
      const alice = (
        await call("/subscribers", "POST", { reference: "S001", name: "علي" })
      ).body;
      const updated = (
        await call("/subscribers", "POST", {
          reference: "S001",
          name: "علي المحدد",
        })
      ).body;
      assert.equal(alice.id, updated.id);
      const empty = (
        await call("/subscribers", "POST", {
          reference: "S002",
          name: "دون أجهزة",
        })
      ).body;
      const second = (
        await db
          .prepare(
            "SELECT id FROM devices WHERE token='valid_other_payment_device_token_1234567890'",
          )
          .first()
      ).id;
      for (const id of [deviceId, second])
        assert.equal(
          (
            await call(`/devices/${id}/subscriber`, "PUT", {
              subscriberId: alice.id,
            })
          ).status,
          200,
        );
      assert.equal(
        (
          await call(`/devices/${deviceId}/subscriber`, "PUT", {
            subscriberId: 999999,
          })
        ).status,
        400,
      );
      await db
        .prepare(
          "INSERT INTO devices(token,platform,segment,active,created_at,subscriber_id) VALUES(?,'android','test',1,?,NULL)",
        )
        .bind(
          "valid_unselected_fixture_token_1234567890",
          new Date().toISOString(),
        )
        .run();
      await db
        .prepare(
          "INSERT INTO devices(token,platform,segment,active,created_at,subscriber_id) VALUES(?,'ios','test',1,?,?)",
        )
        .bind(
          "valid_selected_ios_fixture_token_1234567890",
          new Date().toISOString(),
          alice.id,
        )
        .run();
      const input = {
        ...draft,
        name: "حملة محددة",
        audience_mode: "users",
        subscriberIds: [alice.id],
      };
      assert.equal(
        (await call("/campaigns", "POST", { ...input, subscriberIds: [] }))
          .status,
        400,
      );
      assert.equal(
        (
          await call("/campaigns", "POST", {
            ...input,
            subscriberIds: [999999],
          })
        ).status,
        400,
      );
      assert.equal(
        (await call("/campaigns", "POST", { ...input, audience_mode: "all" }))
          .status,
        400,
      );
      const id = (await call("/campaigns", "POST", input)).body.id;
      const claims = await Promise.all([
        call(`/campaigns/${id}/send`, "POST", {}),
        call(`/campaigns/${id}/send`, "POST", {}),
      ]);
      assert.deepEqual(
        claims.map((result) => result.status).sort(),
        [202, 409],
      );
      await expect
        .poll(
          async () =>
            (
              await db
                .prepare("SELECT status FROM campaigns WHERE id=?")
                .bind(id)
                .first()
            ).status,
        )
        .toBe("sent");
      const deliveries = (
        await db
          .prepare(
            "SELECT device_id FROM deliveries WHERE campaign_id=? ORDER BY device_id",
          )
          .bind(id)
          .all()
      ).results;
      assert.deepEqual(
        deliveries.map((row) => row.device_id),
        [deviceId, second].sort((a, b) => a - b),
      );
      const copy = (await call(`/campaigns/${id}/duplicate`, "POST", {})).body;
      assert.equal(copy.audience_mode, "users");
      assert.deepEqual(JSON.parse(copy.subscriber_ids), [alice.id]);
      assert.equal(
        (await call(`/campaigns/${copy.id}/send`, "POST", {})).status,
        202,
      );
      await expect
        .poll(
          async () =>
            (
              await db
                .prepare("SELECT status FROM campaigns WHERE id=?")
                .bind(copy.id)
                .first()
            ).status,
        )
        .toBe("sent");
      assert.deepEqual(
        (
          await db
            .prepare(
              "SELECT device_id FROM deliveries WHERE campaign_id=? ORDER BY device_id",
            )
            .bind(copy.id)
            .all()
        ).results,
        deliveries,
      );
      const nobody = (
        await call("/campaigns", "POST", {
          ...input,
          subscriberIds: [empty.id],
        })
      ).body.id;
      assert.equal(
        (await call(`/campaigns/${nobody}/send`, "POST", {})).status,
        409,
      );
      assert.equal(
        (
          await db
            .prepare(
              "SELECT COUNT(*) AS count FROM deliveries WHERE campaign_id=?",
            )
            .bind(nobody)
            .first()
        ).count,
        0,
      );
    },
  );
  await t.test(
    "notification types are configurable, disabled types reject new events and queued events retain their template",
    async () => {
      const headers = { Authorization: "Bearer " + mobileCredential };
      assert.equal(
        (await call("/mobile/notification-types", "GET")).status,
        401,
      );
      const template = {
        key: "custom_event",
        name: "حدث مخصص",
        title: "عنوان قبل التعديل",
        body: "قيمة {amount} ورقم {operationId}",
        active: true,
      };
      assert.equal(
        (
          await call("/notification-types", "POST", template, {
            headers: { Cookie: "" },
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await call("/notification-types", "POST", {
            ...template,
            key: "Bad key",
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await call("/notification-types", "POST", {
            ...template,
            body: "{unsupported}",
          })
        ).status,
        400,
      );
      assert.equal(
        (await call("/notification-types", "POST", template)).status,
        200,
      );
      assert.ok(
        (
          await call("/mobile/notification-types", "GET", undefined, {
            headers,
          })
        ).body.some((type) => type.key === template.key),
      );
      const event = {
        requestId: "custom-event-snapshot-123",
        amount: 700,
        delayed: true,
        eventType: template.key,
      };
      const result = await call("/mobile/payments", "POST", event, { headers });
      assert.equal(result.status, 200);
      const before = paymentMessages.length;
      await call("/notification-types", "POST", {
        ...template,
        title: "عنوان جديد",
        active: false,
      });
      assert.ok(
        !(
          await call("/mobile/notification-types", "GET", undefined, {
            headers,
          })
        ).body.some((type) => type.key === template.key),
      );
      assert.equal(
        (
          await call(
            "/mobile/payments",
            "POST",
            { ...event, requestId: "custom-disabled-event-123" },
            { headers },
          )
        ).status,
        400,
      );
      assert.equal(
        (await call("/mobile/payments", "POST", event, { headers })).body.id,
        result.body.id,
      );
      assert.equal(
        (
          await call(
            "/mobile/payments",
            "POST",
            { ...event, eventType: "invoice_paid" },
            { headers },
          )
        ).status,
        409,
      );
      await db
        .prepare("UPDATE demo_payments SET notify_after=0 WHERE id=?")
        .bind(result.body.id)
        .run();
      await (
        await mf.getWorker("cms")
      ).scheduled({ cron: "* * * * *", scheduledTime: Date.now() });
      assert.equal(paymentMessages.length, before + 1);
      assert.equal(paymentMessages.at(-1).notification.title, template.title);
      assert.ok(
        paymentMessages.at(-1).notification.body.includes(result.body.id),
      );
      assert.equal(paymentMessages.at(-1).data.eventType, template.key);
    },
  );
  await t.test(
    "oversized requests are rejected; admin can revoke device and logout revokes cookie",
    async () => {
      assert.equal(
        (await call("/campaigns", "POST", { ...draft, body: "x".repeat(9000) }))
          .status,
        413,
      );
      assert.equal((await call(`/devices/${deviceId}`, "DELETE")).status, 200);
      assert.equal(
        (
          await call(
            "/mobile/device",
            "PUT",
            { token: "valid_fcm_token_1234567890" },
            { headers: { Authorization: "Bearer " + mobileCredential } },
          )
        ).status,
        401,
      );
      assert.equal((await call("/logout", "POST", {})).status, 200);
      assert.equal((await call("/admin")).status, 401);
      assert.equal(
        (
          await call("/login", "POST", {
            email: "admin@example.test",
            password: "incorrect-password",
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await call("/login", "POST", {
            email: "admin@example.test",
            password: "test-password-with-12-characters",
          })
        ).status,
        200,
      );
    },
  );
  await t.test(
    "Arabic dashboard supports browser login, campaign editing, device pairing and mobile layout",
    { skip: process.env.RUN_BROWSER_TEST !== "1" },
    async () => {
      const browser = await chromium.launch({
        headless: true,
        ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
          : {}),
      });
      try {
        const page = await browser.newPage({
          viewport: { width: 390, height: 844 },
        });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto((await mf.ready).toString());
        await expect(page.locator("#auth")).toBeVisible();

        await page.getByLabel("البريد الإلكتروني").fill("admin@example.test");
        await page
          .getByLabel("كلمة المرور")
          .fill("test-password-with-12-characters");
        await page
          .getByRole("button", { name: "تسجيل الدخول", exact: true })
          .click();
        await expect(
          page.getByRole("heading", { name: "لوحة إدارة الإشعارات" }),
        ).toBeVisible();
        await expect(page.locator(".brand img")).toBeVisible();
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.screenshot({
          path: "/tmp/cash-mobile-dashboard-desktop.png",
          fullPage: true,
        });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({
          path: "/tmp/cash-mobile-dashboard-mobile.png",
          fullPage: true,
        });
        await page
          .getByRole("button", { name: "الحملات", exact: true })
          .click();
        const resendRow = page
          .locator("#campaign-list .list-row")
          .filter({ hasText: "batch-test" })
          .filter({
            has: page.getByRole("button", { name: "إعادة إرسال", exact: true }),
          })
          .first();
        const beforeDirectResend = sends;
        const countBefore = (
          await db.prepare("SELECT COUNT(*) AS count FROM campaigns").first()
        ).count;
        page.once("dialog", (dialog) => dialog.dismiss());
        await resendRow
          .getByRole("button", { name: "إعادة إرسال", exact: true })
          .click();
        assert.equal(
          (await db.prepare("SELECT COUNT(*) AS count FROM campaigns").first())
            .count,
          countBefore,
        );
        assert.equal(sends, beforeDirectResend);
        page.once("dialog", (dialog) => dialog.accept());
        await resendRow
          .getByRole("button", { name: "إعادة إرسال", exact: true })
          .click();
        await expect(page.locator("#notice")).toContainText(
          "بدأت إعادة إرسال الحملة",
        );
        await expect.poll(() => sends).toBe(beforeDirectResend + 5);
        const directCopy = await db
          .prepare(
            "SELECT * FROM campaigns WHERE segment='batch-test' ORDER BY id DESC LIMIT 1",
          )
          .first();
        assert.equal(directCopy.status, "sending");
        await (
          await mf.getWorker("cms")
        ).scheduled({ cron: "* * * * *", scheduledTime: Date.now() });
        // The UI must discover completion without pressing manual refresh.
        await expect(
          page
            .locator("#campaign-list .list-row")
            .filter({
              has: page.getByText(directCopy.name, { exact: true }),
            })
            .getByRole("button", { name: "إعادة إرسال", exact: true }),
        ).toBeVisible({ timeout: 15000 });
        const beforeResendDraft = sends;
        await page
          .locator("#campaign-list .list-row")
          .filter({
            has: page.getByRole("button", { name: "نسخ للتعديل", exact: true }),
          })
          .first()
          .getByRole("button", { name: "نسخ للتعديل", exact: true })
          .click();
        await expect(page.locator("#notice")).toContainText(
          "جُهّزت نسخة جديدة",
        );
        await expect(
          page.locator('#campaign-form input[name="id"]'),
        ).toHaveValue(/^[1-9][0-9]*$/);
        assert.equal(sends, beforeResendDraft);
        await page.getByLabel("اسم الحملة").fill("حملة من المتصفح");
        await page
          .locator("#campaign-form")
          .getByLabel("عنوان الإشعار", { exact: true })
          .fill("اختبار الواجهة");
        await page
          .locator("#campaign-form")
          .getByLabel("نص الإشعار", { exact: true })
          .fill("رسالة آمنة من الاختبار");
        await expect(page.locator("#preview-title")).toHaveText(
          "اختبار الواجهة",
        );
        await page
          .getByRole("button", { name: "حفظ الحملة", exact: true })
          .click();
        await expect(page.locator("#notice")).toHaveText("تم حفظ الحملة.");
        await expect(
          page
            .locator("#campaign-list")
            .getByText("حملة من المتصفح", { exact: true }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "المشتركون", exact: true })
          .click();
        await page
          .locator("#subscriber-form")
          .getByLabel("رقم المشترك أو الهاتف", { exact: true })
          .fill("S003");
        await page
          .locator("#subscriber-form")
          .getByLabel("اسم المشترك", { exact: true })
          .fill("مشترك المتصفح");
        await page
          .getByRole("button", { name: "حفظ المشترك", exact: true })
          .click();
        await expect(page.locator("#subscriber-list")).toContainText(
          "مشترك المتصفح",
        );
        const browserUser = await db
          .prepare("SELECT id FROM subscribers WHERE reference='S003'")
          .first();
        await page
          .getByRole("button", { name: "أنواع الإشعارات", exact: true })
          .click();
        const typeForm = page.locator("#type-form");
        await typeForm
          .getByLabel("رمز النوع", { exact: true })
          .fill("browser_event");
        await typeForm
          .getByLabel("اسم النوع", { exact: true })
          .fill("إشعار من المتصفح");
        await typeForm
          .getByLabel("عنوان الإشعار", { exact: true })
          .fill("تجربة قالب جديد");
        await typeForm
          .getByLabel("قالب نص الإشعار", { exact: true })
          .fill("المبلغ {amount} ل.س");
        await page
          .getByRole("button", { name: "حفظ نوع الإشعار", exact: true })
          .click();
        await expect(page.locator("#type-list")).toContainText(
          "إشعار من المتصفح",
        );
        await page
          .getByRole("button", { name: "الحملات", exact: true })
          .click();
        await page
          .getByRole("button", { name: "مسح النموذج", exact: true })
          .click();
        const campaignForm = page.locator("#campaign-form");
        await campaignForm
          .getByLabel("اسم الحملة", { exact: true })
          .fill("حملة لمشترك معين");
        await campaignForm
          .getByLabel("عنوان الإشعار", { exact: true })
          .fill("إشعار خاص");
        await campaignForm
          .getByLabel("نص الإشعار", { exact: true })
          .fill("للمشترك المختار فقط");
        await campaignForm
          .getByLabel("نطاق الجمهور", { exact: true })
          .selectOption("users");
        await campaignForm
          .getByRole("checkbox", { name: /مشترك المتصفح/ })
          .check();
        await page
          .getByRole("button", { name: "حفظ الحملة", exact: true })
          .click();
        await expect(page.locator("#campaign-list")).toContainText(
          "حملة لمشترك معين",
        );
        const saved = await db
          .prepare(
            "SELECT audience_mode,subscriber_ids FROM campaigns WHERE name='حملة لمشترك معين'",
          )
          .first();
        assert.equal(saved.audience_mode, "users");
        assert.deepEqual(JSON.parse(saved.subscriber_ids), [browserUser.id]);
        await page.locator("#global-search").fill("حملة لمشترك معين");
        await expect(page.locator("#campaign-list .list-row")).toHaveCount(1);
        await page.locator("#global-search").fill("");
        await page
          .getByRole("button", { name: "الأجهزة والربط", exact: true })
          .click();
        const deviceForUser = await db
          .prepare(
            "SELECT id FROM devices WHERE token='valid_other_payment_device_token_1234567890'",
          )
          .first();
        const assignSelect = page.getByLabel(
          `مشترك الجهاز #${deviceForUser.id}`,
          { exact: true },
        );
        await assignSelect.selectOption(String(browserUser.id));
        await assignSelect
          .locator("..")
          .getByRole("button", { name: "حفظ ربط المشترك", exact: true })
          .click();
        await expect
          .poll(
            async () =>
              (
                await db
                  .prepare("SELECT subscriber_id FROM devices WHERE id=?")
                  .bind(deviceForUser.id)
                  .first()
              ).subscriber_id,
          )
          .toBe(browserUser.id);
        await page
          .getByRole("button", { name: "إنشاء رمز ربط", exact: true })
          .click();
        await expect(page.locator("#pairing-result")).toBeVisible();
        await expect(page.locator("#pairing-value")).toHaveValue(
          /^[A-F0-9]{4}( [A-F0-9]{4}){3}$/,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        await page.screenshot({
          path: "/tmp/nabdh-cloudflare-dashboard.png",
          fullPage: true,
        });
        await page
          .getByRole("button", { name: "الإعدادات", exact: true })
          .click();
        await page
          .getByRole("button", {
            name: "فحص إعداد Firebase دون إرسال",
            exact: true,
          })
          .click();
        await expect(page.locator("#notice")).toContainText("لم يُرسل إشعار");
        await page
          .getByRole("button", { name: "تسجيل الخروج", exact: true })
          .click();
        await expect(
          page.getByRole("heading", { name: "تسجيل الدخول", exact: true }),
        ).toBeVisible();
        assert.deepEqual(errors, []);
      } finally {
        await browser.close();
      }
    },
  );

  await t.test(
    "mobile accounts authenticate, automatically target devices, isolate histories and revoke sessions",
    async () => {
      const phone = "+963944000111",
        password = "account-test-password";
      const token = "account_device_" + "a".repeat(30);
      const anonymous = { headers: { Cookie: "" } };
      const signup = await call(
        "/mobile/register",
        "POST",
        {
          phone: "00963 944 000 111",
          password,
          name: "ليلى",
          token,
          platform: "android",
        },
        anonymous,
      );
      assert.equal(signup.status, 200, JSON.stringify(signup.body));
      const user = signup.body.account;
      assert.equal(user.phone, phone);
      assert.equal(user.name, "ليلى");
      const session = (credential) => ({
        headers: { Authorization: `Bearer ${credential}`, Cookie: "" },
      });
      assert.equal(
        (
          await call(
            "/mobile/me",
            "GET",
            undefined,
            session(signup.body.credential),
          )
        ).body.id,
        user.id,
      );
      const device = await db
        .prepare("SELECT subscriber_id FROM devices WHERE id=?")
        .bind(signup.body.deviceId)
        .first();
      assert.equal(device.subscriber_id, user.id);
      const hash = await db
        .prepare(
          "SELECT password_hash FROM mobile_accounts WHERE subscriber_id=?",
        )
        .bind(user.id)
        .first();
      assert.ok(!hash.password_hash.includes(password));
      assert.equal(
        (
          await call(
            "/mobile/register",
            "POST",
            { phone, password, name: "انتحال", token, platform: "android" },
            anonymous,
          )
        ).status,
        409,
      );
      const wrong = await call(
        "/mobile/login",
        "POST",
        { phone, password: "wrong-password", token, platform: "android" },
        anonymous,
      );
      assert.equal(wrong.status, 401);
      assert.equal(
        (
          await call(
            "/mobile/me",
            "GET",
            undefined,
            session(signup.body.credential),
          )
        ).status,
        200,
      );
      const second = await call(
        "/mobile/login",
        "POST",
        {
          phone,
          password,
          token: "account_second_" + "b".repeat(30),
          platform: "android",
        },
        anonymous,
      );
      assert.equal(second.status, 200);
      assert.equal(second.body.account.id, user.id);
      assert.notEqual(second.body.deviceId, signup.body.deviceId);
      const signed = await call("/login", "POST", {
        email: "admin@example.test",
        password: "test-password-with-12-characters",
      });
      cookie = signed.response.headers.get("set-cookie").split(";")[0];
      const campaign = await call("/campaigns", "POST", {
        name: "حملة حساب",
        title: "حسابي",
        body: "مشتركون محددون",
        platform: "android",
        segment: "test",
        link: "",
        scheduled_at: "",
        audience_mode: "users",
        subscriberIds: [user.id],
      });
      assert.equal(campaign.status, 200);
      assert.equal(
        (await call(`/campaigns/${campaign.body.id}/send`, "POST", {})).status,
        202,
      );
      await new Promise((r) => setTimeout(r, 150));
      const audience = await db
        .prepare(
          "SELECT device_id FROM deliveries WHERE campaign_id=? ORDER BY device_id",
        )
        .bind(campaign.body.id)
        .all();
      assert.deepEqual(
        audience.results.map((x) => x.device_id),
        [signup.body.deviceId, second.body.deviceId].sort((a, b) => a - b),
      );
      assert.equal(
        (
          await call(`/devices/${signup.body.deviceId}/subscriber`, "PUT", {
            subscriberId: null,
          })
        ).status,
        400,
      );
      const pairing = await call("/pairing-code", "POST", {});
      assert.equal(
        (
          await call(
            "/mobile/pair",
            "POST",
            { code: pairing.body.code, token, platform: "android" },
            anonymous,
          )
        ).status,
        409,
      );
      const payment = await call(
        "/mobile/payments",
        "POST",
        { requestId: "account-payment-test", amount: 20000 },
        session(signup.body.credential),
      );
      assert.equal(payment.status, 200);
      assert.equal(
        (
          await call(
            "/mobile/device",
            "DELETE",
            {},
            session(signup.body.credential),
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await call(
            "/mobile/me",
            "GET",
            undefined,
            session(signup.body.credential),
          )
        ).status,
        401,
      );
      assert.equal(
        (
          await call(
            "/mobile/me",
            "GET",
            undefined,
            session(second.body.credential),
          )
        ).status,
        200,
      );
      // The same physical token used by another account gets a fresh device ID/history.
      const other = await call(
        "/mobile/register",
        "POST",
        {
          phone: "+963944000222",
          password,
          name: "حساب آخر",
          token,
          platform: "android",
        },
        anonymous,
      );
      assert.equal(other.status, 200, JSON.stringify(other.body));
      assert.notEqual(other.body.deviceId, signup.body.deviceId);
      assert.notEqual(other.body.account.id, user.id);
      assert.deepEqual(
        (
          await call(
            "/mobile/payments",
            "GET",
            undefined,
            session(other.body.credential),
          )
        ).body,
        [],
      );
      assert.deepEqual(
        (
          await call(
            `/mobile/payments?id=${payment.body.id}`,
            "GET",
            undefined,
            session(other.body.credential),
          )
        ).body,
        [],
      );
      const takeover = await call(
        "/mobile/login",
        "POST",
        { phone, password, token, platform: "android" },
        anonymous,
      );
      assert.equal(takeover.status, 409);
      assert.equal(
        (
          await call(
            "/mobile/me",
            "GET",
            undefined,
            session(other.body.credential),
          )
        ).status,
        200,
      );
      // A new sign-in on one device rotates that device session, not other devices.
      const relogin = await call(
        "/mobile/login",
        "POST",
        {
          phone,
          password,
          token: "account_second_" + "b".repeat(30),
          platform: "android",
        },
        anonymous,
      );
      assert.equal(relogin.status, 200);
      assert.equal(
        (
          await call(
            "/mobile/me",
            "GET",
            undefined,
            session(second.body.credential),
          )
        ).status,
        401,
      );
      assert.equal(
        (
          await call(
            "/mobile/me",
            "GET",
            undefined,
            session(relogin.body.credential),
          )
        ).status,
        200,
      );
      const reserved = "+963944000333";
      await call("/subscribers", "POST", {
        reference: reserved,
        name: "مستخدم مستورد",
      });
      assert.equal(
        (
          await call(
            "/mobile/register",
            "POST",
            {
              phone: reserved,
              password,
              name: "محاولة",
              token: "another_" + "c".repeat(30),
              platform: "android",
            },
            anonymous,
          )
        ).status,
        409,
      );
      const raceBody = {
        phone: "+963944000444",
        password,
        name: "تسجيل متزامن",
        token: "race_account_" + "r".repeat(30),
        platform: "android",
      };
      const race = await Promise.all([
        call("/mobile/register", "POST", raceBody, {
          headers: { "CF-Connecting-IP": "192.0.2.11" },
        }),
        call("/mobile/register", "POST", raceBody, {
          headers: { "CF-Connecting-IP": "192.0.2.12" },
        }),
      ]);
      assert.deepEqual(race.map((x) => x.status).sort(), [200, 409]);
      const rows = await db
        .prepare(
          "SELECT count(*) AS n FROM mobile_accounts a JOIN subscribers s ON s.id=a.subscriber_id WHERE s.reference=?",
        )
        .bind(raceBody.phone)
        .first();
      assert.equal(rows.n, 1);
      const limited = { headers: { "CF-Connecting-IP": "192.0.2.100" } };
      let blocked;
      for (let i = 0; i < 16; i++)
        blocked = await call(
          "/mobile/login",
          "POST",
          { phone: "+963944555555", password, token, platform: "android" },
          limited,
        );
      assert.equal(blocked.status, 429);
    },
  );
});
