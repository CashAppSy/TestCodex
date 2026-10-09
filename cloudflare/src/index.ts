import {
  digest,
  equal,
  HttpError,
  passwordHash,
  random,
  readBody,
  text,
  validToken,
} from "./security";
import { claimCampaign, oauth, processCampaign, tick, type Env } from "./push";
const cookieName = "nabdh_session";
const json = (
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
function cookie(request: Request) {
  return (
    request.headers
      .get("cookie")
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith(cookieName + "="))
      ?.slice(cookieName.length + 1) || ""
  );
}
function cookieHeader(request: Request, token: string, maxAge = 604800) {
  return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
async function budget(env: Env, key: string, max: number, window: number) {
  const now = Date.now();
  const row = await env.DB.prepare(
    "INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END,expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING count",
  )
    .bind(await digest(key), now + window, now, now)
    .first<{ count: number }>();
  if (!row || row.count > max)
    throw new HttpError(429, "طلبات كثيرة. انتظر قليلًا وأعد المحاولة.");
}
async function admin(env: Env, request: Request) {
  const token = cookie(request);
  if (!/^[a-f0-9]{64}$/.test(token))
    throw new HttpError(401, "سجّل دخولك أولًا.");
  const row = await env.DB.prepare(
    "SELECT a.id,a.name,a.email FROM admins a JOIN sessions s ON s.admin_id=a.id WHERE s.token_hash=? AND s.expires_at>?",
  )
    .bind(await digest(token), Date.now())
    .first();
  if (!row) throw new HttpError(401, "انتهت الجلسة. سجّل دخولك.");
  return row;
}
async function signIn(env: Env, request: Request) {
  const token = random();
  await env.DB.prepare(
    "INSERT INTO sessions(token_hash,admin_id,expires_at) VALUES(?,1,?)",
  )
    .bind(await digest(token), Date.now() + 604800000)
    .run();
  return json({ ok: true }, 200, {
    "Set-Cookie": cookieHeader(request, token),
  });
}
async function mobileDevice(env: Env, request: Request) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!token) throw new HttpError(401, "جلسة الجهاز غير صالحة.");
  const hash = await digest(token);
  const row = await env.DB.prepare(
    "SELECT device_id FROM mobile_sessions WHERE credential_hash=? AND expires_at>?",
  )
    .bind(hash, Date.now())
    .first<{ device_id: number }>();
  if (!row) throw new HttpError(401, "أعد ربط الجهاز باللوحة.");
  return { id: row.device_id, hash };
}
async function api(request: Request, env: Env, ctx: ExecutionContext) {
  const url = new URL(request.url),
    path = url.pathname,
    method = request.method;
  if (path === "/api/status" && method === "GET") {
    const hasAdmin = !!(await env.DB.prepare(
      "SELECT id FROM admins LIMIT 1",
    ).first());
    return json({
      hasAdmin,
      bootstrapConfigured:
        !!env.BOOTSTRAP_TOKEN && env.BOOTSTRAP_TOKEN.length >= 32,
    });
  }
  if (path.startsWith("/api/mobile/")) {
    if (path === "/api/mobile/pair" && method === "POST") {
      await budget(
        env,
        `pair:${request.headers.get("CF-Connecting-IP") || "local"}`,
        30,
        60000,
      );
      const b = await readBody(request),
        code = text(b, "code", 64).replace(/[\s-]/g, "").toUpperCase(),
        token = text(b, "token", 4096);
      if (
        !/^[A-F0-9]{16}$/.test(code) ||
        !validToken(token) ||
        b.platform !== "android"
      )
        throw new HttpError(400, "تحقق من بيانات الربط.");
      const credential = random(),
        credentialHash = await digest(credential),
        codeHash = await digest(code),
        now = Date.now();
      const result = await env.DB.batch([
        env.DB.prepare(
          "UPDATE mobile_pairing_codes SET claimed_by=? WHERE code_hash=? AND expires_at>? AND claimed_by IS NULL",
        ).bind(credentialHash, codeHash, now),
        env.DB.prepare(
          "INSERT INTO devices(token,platform,segment,created_at) SELECT ?,'android','test',? WHERE EXISTS(SELECT 1 FROM mobile_pairing_codes WHERE code_hash=? AND claimed_by=?) ON CONFLICT(token) DO UPDATE SET active=1,platform='android',segment='test'",
        ).bind(token, new Date().toISOString(), codeHash, credentialHash),
        env.DB.prepare(
          "DELETE FROM mobile_sessions WHERE device_id=(SELECT id FROM devices WHERE token=?) AND EXISTS(SELECT 1 FROM mobile_pairing_codes WHERE code_hash=? AND claimed_by=?)",
        ).bind(token, codeHash, credentialHash),
        env.DB.prepare(
          "INSERT INTO mobile_sessions(credential_hash,device_id,expires_at) SELECT ?,id,? FROM devices WHERE token=? AND EXISTS(SELECT 1 FROM mobile_pairing_codes WHERE code_hash=? AND claimed_by=?)",
        ).bind(
          credentialHash,
          now + 2592000000,
          token,
          codeHash,
          credentialHash,
        ),
        env.DB.prepare(
          "SELECT device_id FROM mobile_sessions WHERE credential_hash=?",
        ).bind(credentialHash),
        env.DB.prepare(
          "DELETE FROM mobile_pairing_codes WHERE code_hash=? AND claimed_by=?",
        ).bind(codeHash, credentialHash),
      ]);
      const session = result[4].results[0] as { device_id: number } | undefined;
      if (!session)
        throw new HttpError(400, "رمز الربط منتهي أو مستخدم بالفعل.");
      return json({ deviceId: session.device_id, credential, segment: "test" });
    }
    if (path === "/api/mobile/device" && ["PUT", "DELETE"].includes(method)) {
      const device = await mobileDevice(env, request);
      if (method === "DELETE") {
        await env.DB.batch([
          env.DB.prepare("UPDATE devices SET active=0 WHERE id=?").bind(
            device.id,
          ),
          env.DB.prepare("DELETE FROM mobile_sessions WHERE device_id=?").bind(
            device.id,
          ),
        ]);
        return json({ ok: true });
      }
      const token = text(await readBody(request), "token", 4096);
      if (!validToken(token)) throw new HttpError(400, "رمز الجهاز غير صالح.");
      const result = await env.DB.prepare(
        "UPDATE devices SET token=?,active=1 WHERE id=? AND NOT EXISTS(SELECT 1 FROM devices WHERE token=? AND id<>?) RETURNING id",
      )
        .bind(token, device.id, token, device.id)
        .first();
      if (!result) throw new HttpError(400, "رمز الجهاز مسجل لجهاز آخر.");
      return json({ ok: true, deviceId: device.id });
    }
    throw new HttpError(404, "المسار غير موجود.");
  }
  // Browser mutations must come from the same origin. Mobile routes use scoped bearer credentials instead.
  if (
    !["GET", "HEAD"].includes(method) &&
    request.headers.get("Origin") !== url.origin
  )
    throw new HttpError(403, "مصدر الطلب غير مسموح.");
  if (path === "/api/setup" && method === "POST") {
    await budget(
      env,
      `setup:${request.headers.get("CF-Connecting-IP") || "local"}`,
      10,
      900000,
    );
    if (await env.DB.prepare("SELECT id FROM admins LIMIT 1").first())
      throw new HttpError(409, "حساب المدير موجود. سجّل الدخول.");
    if (!env.BOOTSTRAP_TOKEN || env.BOOTSTRAP_TOKEN.length < 32)
      throw new HttpError(
        503,
        "أضف سر BOOTSTRAP_TOKEN في إعدادات Worker أولًا.",
      );
    const b = await readBody(request);
    if (
      !equal(
        await digest(text(b, "bootstrapToken", 256)),
        await digest(env.BOOTSTRAP_TOKEN),
      )
    )
      throw new HttpError(403, "رمز التهيئة غير صحيح.");
    const name = text(b, "name", 100),
      email = text(b, "email", 254).toLowerCase();
    const password = b.password;
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof password !== "string" ||
      password.length < 12 ||
      password.length > 256
    )
      throw new HttpError(
        400,
        "تحقق من البريد وكلمة المرور؛ طولها 12 حرفًا على الأقل.",
      );
    const row = await env.DB.prepare(
      "INSERT OR IGNORE INTO admins(id,name,email,password_hash) VALUES(1,?,?,?) RETURNING id",
    )
      .bind(name, email, await passwordHash(password))
      .first();
    if (!row) throw new HttpError(409, "أُنشئ المدير بالفعل.");
    return signIn(env, request);
  }
  if (path === "/api/login" && method === "POST") {
    const b = await readBody(request),
      email = text(b, "email", 254).toLowerCase();
    await budget(
      env,
      `login-ip:${request.headers.get("CF-Connecting-IP") || "local"}`,
      30,
      900000,
    );
    await budget(env, `login-email:${email}`, 10, 900000);
    if (typeof b.password !== "string" || b.password.length > 256)
      throw new HttpError(400, "كلمة المرور غير صالحة.");
    const account = await env.DB.prepare(
      "SELECT password_hash FROM admins WHERE email=?",
    )
      .bind(email)
      .first<{ password_hash: string }>();
    const saved =
      account?.password_hash ||
      "00000000000000000000000000000000:" + "00".repeat(32);
    if (
      !equal(await passwordHash(b.password, saved.split(":")[0]), saved) ||
      !account
    )
      throw new HttpError(401, "البريد أو كلمة المرور غير صحيحين.");
    await env.DB.prepare("DELETE FROM rate_limits WHERE key=?")
      .bind(await digest(`login-email:${email}`))
      .run();
    return signIn(env, request);
  }
  const user = await admin(env, request);
  if (path === "/api/firebase/check" && method === "POST") {
    if (!env.FCM_SERVICE_ACCOUNT_JSON)
      throw new HttpError(503, "أضف سر Firebase أولًا.");
    await budget(env, "firebase-check", 5, 60000);
    try {
      const account = await oauth(env.FCM_SERVICE_ACCOUNT_JSON);
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${account.project}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${account.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            validate_only: true,
            message: {
              topic: "nabdh-configuration-validation",
              notification: {
                title: "Configuration validation",
                body: "Dry run only",
              },
            },
          }),
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!response.ok) throw new Error();
      return json({ ok: true, validationOnly: true });
    } catch {
      throw new HttpError(
        502,
        "فشل فحص Firebase. تحقق من السر وصلاحية FCM API.",
      );
    }
  }
  const deviceMatch = path.match(/^\/api\/devices\/([1-9][0-9]*)$/);
  if (deviceMatch && method === "DELETE") {
    const id = Number(deviceMatch[1]);
    await env.DB.batch([
      env.DB.prepare("UPDATE devices SET active=0 WHERE id=?").bind(id),
      env.DB.prepare("DELETE FROM mobile_sessions WHERE device_id=?").bind(id),
    ]);
    return json({ ok: true });
  }
  if (path === "/api/logout" && method === "POST") {
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?")
      .bind(await digest(cookie(request)))
      .run();
    return json({ ok: true }, 200, {
      "Set-Cookie": cookieHeader(request, "", 0),
    });
  }
  if (path === "/api/admin" && method === "GET") {
    const result = await env.DB.batch([
      env.DB.prepare(
        "SELECT id,name,title,body,platform,segment,link,status,scheduled_at,created_at,updated_at,completed_at,error,accepted,failed FROM campaigns ORDER BY id DESC LIMIT 100",
      ),
      env.DB.prepare(
        "SELECT id,platform,segment,active,created_at FROM devices ORDER BY id DESC LIMIT 100",
      ),
      env.DB.prepare(
        "SELECT campaign_id,device_id,status,error,provider_id FROM deliveries ORDER BY campaign_id DESC,device_id DESC LIMIT 100",
      ),
    ]);
    return json({
      user,
      campaigns: result[0].results,
      devices: result[1].results,
      deliveries: result[2].results,
      firebaseConfigured: !!env.FCM_SERVICE_ACCOUNT_JSON,
    });
  }
  if (path === "/api/pairing-code" && method === "POST") {
    const code = random(8).toUpperCase(),
      expiresAt = Date.now() + 600000;
    await env.DB.batch([
      env.DB.prepare("DELETE FROM mobile_pairing_codes"),
      env.DB.prepare(
        "INSERT INTO mobile_pairing_codes(code_hash,expires_at) VALUES(?,?)",
      ).bind(await digest(code), expiresAt),
    ]);
    return json({ code, expiresAt });
  }
  if (path === "/api/campaigns" && method === "POST") {
    const b = await readBody(request);
    const name = text(b, "name", 100),
      title = text(b, "title", 120),
      body = text(b, "body", 1000),
      platform = text(b, "platform", 10),
      segment = text(b, "segment", 64),
      link = text(b, "link", 2048, false);
    if (
      !["android", "ios", "all"].includes(platform) ||
      !/^[A-Za-z0-9_-]{1,64}$/.test(segment)
    )
      throw new HttpError(400, "تحقق من الجمهور.");
    if (link && !/^nabdh:\/\/campaign\/[A-Za-z0-9_-]+$/.test(link)) {
      try {
        const target = new URL(link);
        if (target.protocol !== "https:" || target.username || target.password)
          throw new Error();
      } catch {
        throw new HttpError(
          400,
          "رابط الحملة يجب أن يكون HTTPS أو شاشة nabdh://campaign/id.",
        );
      }
    }
    let schedule: string | null = null;
    if (b.scheduled_at) {
      if (
        typeof b.scheduled_at !== "string" ||
        !Number.isFinite(Date.parse(b.scheduled_at)) ||
        Date.parse(b.scheduled_at) <= Date.now()
      )
        throw new HttpError(400, "اختر موعدًا مستقبليًا.");
      schedule = new Date(b.scheduled_at).toISOString();
    }
    const status = schedule ? "scheduled" : "draft",
      now = new Date().toISOString();
    let row;
    if (b.id !== undefined) {
      if (!Number.isSafeInteger(b.id) || Number(b.id) < 1)
        throw new HttpError(400, "معرّف غير صالح.");
      row = await env.DB.prepare(
        "UPDATE campaigns SET name=?,title=?,body=?,platform=?,segment=?,link=?,status=?,scheduled_at=?,updated_at=? WHERE id=? AND status IN ('draft','scheduled') RETURNING id",
      )
        .bind(
          name,
          title,
          body,
          platform,
          segment,
          link,
          status,
          schedule,
          now,
          b.id,
        )
        .first();
    } else
      row = await env.DB.prepare(
        "INSERT INTO campaigns(name,title,body,platform,segment,link,status,scheduled_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) RETURNING id",
      )
        .bind(
          name,
          title,
          body,
          platform,
          segment,
          link,
          status,
          schedule,
          now,
          now,
        )
        .first();
    if (!row) throw new HttpError(409, "الحملة غير موجودة أو بدأ إرسالها.");
    return json(row);
  }
  const match = path.match(
    /^\/api\/campaigns\/([1-9][0-9]*)(\/(?:send|duplicate))?$/,
  );
  if (match) {
    const id = Number(match[1]);
    if (match[2] === "/duplicate" && method === "POST") {
      const now = new Date().toISOString();
      const copy = await env.DB.prepare(
        "INSERT INTO campaigns(name,title,body,platform,segment,link,status,created_at,updated_at) SELECT substr(name,1,60)||' · إعادة إرسال #'||id,title,body,platform,segment,link,'draft',?,? FROM campaigns WHERE id=? AND status='sent' RETURNING id,name,title,body,platform,segment,link,status,scheduled_at,accepted,failed",
      )
        .bind(now, now, id)
        .first();
      if (!copy) throw new HttpError(409, "يمكن إعادة إرسال حملة مكتملة فقط.");
      return json(copy, 201);
    }
    if (match[2] === "/send" && method === "POST") {
      if (!env.FCM_SERVICE_ACCOUNT_JSON)
        throw new HttpError(503, "أضف سر Firebase قبل الإرسال.");
      if (!(await claimCampaign(env, id)))
        throw new HttpError(
          409,
          "بدأ إرسال الحملة أو لا توجد أجهزة نشطة في جمهورها.",
        );
      ctx.waitUntil(processCampaign(env, id));
      return json({ ok: true, status: "sending" }, 202);
    }
    if (!match[2] && method === "DELETE") {
      const row = await env.DB.prepare(
        "DELETE FROM campaigns WHERE id=? AND status IN ('draft','scheduled') RETURNING id",
      )
        .bind(id)
        .first();
      if (!row) throw new HttpError(409, "لا يمكن حذف حملة بدأ إرسالها.");
      return json({ ok: true });
    }
  }
  throw new HttpError(404, "المسار غير موجود.");
}
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    if (!new URL(request.url).pathname.startsWith("/api/")) {
      const original = await env.ASSETS.fetch(request);
      const response = new Response(original.body, original);
      response.headers.set(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      );
      response.headers.set("X-Content-Type-Options", "nosniff");
      response.headers.set("Referrer-Policy", "same-origin");
      return response;
    }
    try {
      return await api(request, env, ctx);
    } catch (error) {
      if (error instanceof HttpError)
        return json({ error: error.message }, error.status);
      // Do not expose D1 statements, tokens, service-account contents, or raw provider errors.
      return json(
        {
          error:
            "تعذر تنفيذ العملية. تحقق من ربط D1 وتطبيق migrations في إعدادات النشر.",
        },
        500,
      );
    }
  },
  async scheduled(_event: ScheduledController, env: Env) {
    await tick(env);
  },
} satisfies ExportedHandler<Env>;
