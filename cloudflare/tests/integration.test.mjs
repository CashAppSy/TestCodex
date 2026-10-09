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
              if (body.message.data?.eventType === "payment_demo")
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
        await expect(page.locator(".brand img")).toBeVisible();
        await expect
          .poll(() =>
            page.locator(".brand img").evaluate((image) => image.naturalWidth),
          )
          .toBeGreaterThan(0);
        await page.getByLabel("البريد الإلكتروني").fill("admin@example.test");
        await page
          .getByLabel("كلمة المرور")
          .fill("test-password-with-12-characters");
        await page
          .getByRole("button", { name: "تسجيل الدخول", exact: true })
          .click();
        await expect(
          page.getByRole("heading", { name: "كل رسالة، فرصة جديدة." }),
        ).toBeVisible();
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
        await page.getByLabel("عنوان الإشعار").fill("اختبار الواجهة");
        await page.getByLabel("نص الإشعار").fill("رسالة آمنة من الاختبار");
        await expect(page.locator("#preview-title")).toHaveText(
          "اختبار الواجهة",
        );
        await page
          .getByRole("button", { name: "حفظ الحملة", exact: true })
          .click();
        await expect(page.locator("#notice")).toHaveText("تم حفظ الحملة.");
        await expect(
          page.getByText("حملة من المتصفح", { exact: true }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "الأجهزة والربط", exact: true })
          .click();
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
});
