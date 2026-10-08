import { random } from "./security";
export type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
  BOOTSTRAP_TOKEN?: string;
  FCM_SERVICE_ACCOUNT_JSON?: string;
};
type Campaign = {
  id: number;
  title: string;
  body: string;
  link: string;
  platform: string;
  segment: string;
  status: string;
};
let cached: { project: string; token: string; until: number } | undefined;
const b64 = (value: string | Uint8Array) =>
  btoa(typeof value === "string" ? value : String.fromCharCode(...value))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
export async function oauth(raw: string) {
  const account = JSON.parse(raw);
  if (
    !/^[a-z][a-z0-9-]{4,62}$/.test(account.project_id) ||
    typeof account.client_email !== "string" ||
    typeof account.private_key !== "string"
  )
    throw new Error("Firebase configuration is invalid.");
  if (
    cached &&
    cached.project === account.project_id &&
    cached.until > Date.now() + 60000
  )
    return { project: cached.project, token: cached.token };
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64(JSON.stringify({ iss: account.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }))}`;
  const der = Uint8Array.from(
    atob(
      account.private_key.replace(/-----[^-]+-----/g, "").replace(/\s/g, ""),
    ),
    (c) => c.charCodeAt(0),
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${b64(new Uint8Array(signature))}`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Firebase authentication failed.");
  const result = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!result.access_token) throw new Error("Firebase authentication failed.");
  cached = {
    project: account.project_id,
    token: result.access_token,
    until: Date.now() + Number(result.expires_in || 3600) * 1000,
  };
  return { project: cached.project, token: cached.token };
}
export async function claimCampaign(env: Env, id: number) {
  const claim = random();
  const now = new Date().toISOString();
  const result = await env.DB.batch([
    env.DB.prepare(
      "UPDATE campaigns SET status='sending',claim_token=?,updated_at=? WHERE id=? AND status IN ('draft','scheduled') AND EXISTS(SELECT 1 FROM devices WHERE active=1 AND (campaigns.platform='all' OR platform=campaigns.platform) AND (campaigns.segment='all' OR segment=campaigns.segment)) RETURNING id",
    ).bind(claim, now, id),
    env.DB.prepare(
      "INSERT INTO deliveries(campaign_id,device_id) SELECT c.id,d.id FROM campaigns c JOIN devices d ON d.active=1 AND (c.platform='all' OR d.platform=c.platform) AND (c.segment='all' OR d.segment=c.segment) WHERE c.id=? AND c.claim_token=?",
    ).bind(id, claim),
  ]);
  return result[0].results.length > 0;
}
export async function processCampaign(env: Env, id: number) {
  if (!env.FCM_SERVICE_ACCOUNT_JSON) return;
  const campaign = await env.DB.prepare(
    "SELECT * FROM campaigns WHERE id=? AND status='sending'",
  )
    .bind(id)
    .first<Campaign>();
  if (!campaign) return;
  let account: { project: string; token: string };
  try {
    account = await oauth(env.FCM_SERVICE_ACCOUNT_JSON);
  } catch {
    await env.DB.prepare("UPDATE campaigns SET error=? WHERE id=?")
      .bind(
        "تعذرت مصادقة Firebase؛ لم تُرسل الدفعة. تحقق من السر وصلاحياته.",
        id,
      )
      .run();
    return;
  }
  // Claim at most five deliveries per invocation. Never retry an ambiguous provider outcome.
  const claimed = await env.DB.prepare(
    "UPDATE deliveries SET status='inflight',claimed_at=? WHERE campaign_id=? AND device_id IN (SELECT device_id FROM deliveries WHERE campaign_id=? AND status='pending' ORDER BY device_id LIMIT 5) AND status='pending' RETURNING device_id",
  )
    .bind(Date.now(), id, id)
    .all<{ device_id: number }>();
  await Promise.all(
    claimed.results.map(async (row) => {
      const device = await env.DB.prepare(
        "SELECT token,active FROM devices WHERE id=?",
      )
        .bind(row.device_id)
        .first<{ token: string; active: number }>();
      let status = "failed",
        error: string | null = "الجهاز غير نشط.",
        providerId: string | null = null,
        invalid = false;
      if (device?.active) {
        try {
          const response = await fetch(
            `https://fcm.googleapis.com/v1/projects/${account.project}/messages:send`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${account.token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                message: {
                  token: device.token,
                  notification: { title: campaign.title, body: campaign.body },
                  data: { campaignId: String(campaign.id), url: campaign.link },
                  android: { priority: "high" },
                },
              }),
              signal: AbortSignal.timeout(10000),
            },
          );
          const data = (await response.json()) as {
            name?: string;
            error?: { details?: { errorCode?: string }[] };
          };
          const code = data.error?.details?.find((x) => x.errorCode)?.errorCode;
          if (response.ok) {
            status = "accepted";
            error = null;
            providerId = data.name || null;
          } else {
            error = code || `FCM HTTP ${response.status}`;
            invalid = code === "UNREGISTERED";
          }
        } catch {
          status = "unknown";
          error = "انقطع الاتصال؛ قبول الإشعار غير معروف. لن يُعاد تلقائيًا.";
        }
      }
      const statements = [
        env.DB.prepare(
          "UPDATE deliveries SET status=?,error=?,provider_id=? WHERE campaign_id=? AND device_id=? AND status='inflight'",
        ).bind(status, error, providerId, id, row.device_id),
      ];
      if (invalid)
        statements.push(
          env.DB.prepare("UPDATE devices SET active=0 WHERE id=?").bind(
            row.device_id,
          ),
        );
      await env.DB.batch(statements);
    }),
  );
  await finalize(env, id);
}
export async function finalize(env: Env, id: number) {
  await env.DB.prepare(
    "UPDATE campaigns SET accepted=(SELECT COUNT(*) FROM deliveries WHERE campaign_id=? AND status='accepted'),failed=(SELECT COUNT(*) FROM deliveries WHERE campaign_id=? AND status IN ('failed','unknown')),status=CASE WHEN EXISTS(SELECT 1 FROM deliveries WHERE campaign_id=? AND status IN ('pending','inflight')) THEN 'sending' ELSE 'sent' END,completed_at=CASE WHEN EXISTS(SELECT 1 FROM deliveries WHERE campaign_id=? AND status IN ('pending','inflight')) THEN NULL ELSE ? END,updated_at=? WHERE id=? AND status='sending'",
  )
    .bind(
      id,
      id,
      id,
      id,
      new Date().toISOString(),
      new Date().toISOString(),
      id,
    )
    .run();
}
export async function tick(env: Env) {
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expires_at<=?").bind(now),
    env.DB.prepare("DELETE FROM mobile_sessions WHERE expires_at<=?").bind(now),
    env.DB.prepare("DELETE FROM mobile_pairing_codes WHERE expires_at<=?").bind(
      now,
    ),
    env.DB.prepare("DELETE FROM rate_limits WHERE expires_at<=?").bind(now),
    env.DB.prepare(
      "UPDATE deliveries SET status='unknown',error=? WHERE status='inflight' AND claimed_at<?",
    ).bind(
      "انقطع العامل أثناء الإرسال؛ النتيجة غير معروفة ولن تُعاد تلقائيًا.",
      now - 300000,
    ),
  ]);
  if (!env.FCM_SERVICE_ACCOUNT_JSON) return;
  const sending = await env.DB.prepare(
    "SELECT id FROM campaigns WHERE status='sending' ORDER BY updated_at LIMIT 1",
  ).first<{ id: number }>();
  if (sending) {
    await processCampaign(env, sending.id);
    return;
  }
  const due = await env.DB.prepare(
    "SELECT id FROM campaigns WHERE status='scheduled' AND scheduled_at<=? AND EXISTS(SELECT 1 FROM devices WHERE active=1 AND (campaigns.platform='all' OR platform=campaigns.platform) AND (campaigns.segment='all' OR segment=campaigns.segment)) ORDER BY scheduled_at LIMIT 1",
  )
    .bind(new Date().toISOString())
    .first<{ id: number }>();
  if (due && (await claimCampaign(env, due.id)))
    await processCampaign(env, due.id);
}
