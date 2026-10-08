import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";

export type Admin = { id: number; name: string; email: string };
const path = resolve(
  /* turbopackIgnore: true */ process.env.CMS_DB_PATH || ".data/cms.sqlite",
);
mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
const db = new DatabaseSync(path);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, admin_id INTEGER NOT NULL REFERENCES admins(id), expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS login_attempts (
  email TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY, token TEXT UNIQUE NOT NULL, platform TEXT NOT NULL CHECK(platform IN ('android','ios')),
  segment TEXT NOT NULL DEFAULT 'all', active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
  segment TEXT NOT NULL DEFAULT 'all', platform TEXT NOT NULL DEFAULT 'all', link TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft', scheduled_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  completed_at TEXT, error TEXT, accepted INTEGER NOT NULL DEFAULT 0, failed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS deliveries (
  id INTEGER PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id), device_id INTEGER NOT NULL REFERENCES devices(id),
  status TEXT NOT NULL, error TEXT, provider_id TEXT, created_at TEXT NOT NULL, UNIQUE(campaign_id,device_id)
);
CREATE TABLE IF NOT EXISTS mobile_pairing_codes (
  code_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS mobile_sessions (
  credential_hash TEXT PRIMARY KEY, device_id INTEGER NOT NULL REFERENCES devices(id), expires_at INTEGER NOT NULL
);
`);

export function hasAdmin() {
  return !!db.prepare("SELECT id FROM admins LIMIT 1").get();
}
function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function createAdmin(
  name: string,
  email: string,
  password: string,
): Admin {
  if (
    !name.trim() ||
    name.length > 100 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    password.length < 12 ||
    password.length > 256
  )
    throw new Error("أدخل اسمًا وبريدًا صالحًا وكلمة مرور بين 12 و256 حرفًا.");
  db.exec("BEGIN IMMEDIATE");
  try {
    if (hasAdmin()) throw new Error("تم إنشاء حساب المدير بالفعل. سجّل دخولك.");
    const result = db
      .prepare("INSERT INTO admins(name,email,password_hash) VALUES(?,?,?)")
      .run(name.trim(), email.trim().toLowerCase(), hashPassword(password));
    db.exec("COMMIT");
    return {
      id: Number(result.lastInsertRowid),
      name: name.trim(),
      email: email.trim().toLowerCase(),
    };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
export function authenticate(email: string, password: string): Admin | null {
  const normalized = email.trim().toLowerCase().slice(0, 254);
  const now = Date.now();
  const attempt = db
    .prepare("SELECT count, expires_at FROM login_attempts WHERE email=?")
    .get(normalized) as { count: number; expires_at: number } | undefined;
  if (attempt && attempt.expires_at > now && attempt.count >= 10) return null;
  const admin = db
    .prepare("SELECT * FROM admins WHERE email=?")
    .get(normalized) as (Admin & { password_hash: string }) | undefined;
  const [salt, key] = (
    admin?.password_hash ||
    "00000000000000000000000000000000:" + "00".repeat(64)
  ).split(":");
  const matches = timingSafeEqual(
    scryptSync(password.slice(0, 256), salt, 64),
    Buffer.from(key, "hex"),
  );
  if (!admin || !matches || password.length > 256) {
    db.prepare(
      `INSERT INTO login_attempts(email,count,expires_at) VALUES(?,1,?)
      ON CONFLICT(email) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END,
      expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END`,
    ).run(normalized, now + 900000, now, now);
    return null;
  }
  db.prepare("DELETE FROM login_attempts WHERE email=?").run(normalized);
  return { id: admin.id, name: admin.name, email: admin.email };
}
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function createSession(adminId: number) {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
  const token = randomBytes(32).toString("hex");
  db.prepare(
    "INSERT INTO sessions(token_hash,admin_id,expires_at) VALUES(?,?,?)",
  ).run(digest(token), adminId, Date.now() + 7 * 86400000);
  return token;
}
export function sessionAdmin(token: string | undefined): Admin | null {
  if (!token || token.length !== 64) return null;
  return (
    (db
      .prepare(
        `SELECT a.id,a.name,a.email FROM admins a JOIN sessions s ON s.admin_id=a.id
    WHERE s.token_hash=? AND s.expires_at>?`,
      )
      .get(digest(token), Date.now()) as Admin | undefined) || null
  );
}
export function deleteSession(token: string) {
  db.prepare("DELETE FROM sessions WHERE token_hash=?").run(digest(token));
}
export type Campaign = {
  id: number;
  name: string;
  title: string;
  body: string;
  segment: string;
  platform: string;
  link: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  error: string | null;
  accepted: number;
  failed: number;
};
export type Device = {
  id: number;
  token: string;
  platform: string;
  segment: string;
  active: number;
  created_at: string;
};
export function listCampaigns(): Campaign[] {
  return db
    .prepare("SELECT * FROM campaigns ORDER BY updated_at DESC,id DESC")
    .all() as Campaign[];
}
export function getCampaign(id: number): Campaign | undefined {
  const row = db.prepare("SELECT * FROM campaigns WHERE id=?").get(id) as
    Campaign | undefined;
  return row ? { ...row } : undefined;
}
export function listDevices(): Omit<Device, "token">[] {
  return db
    .prepare(
      "SELECT id,platform,segment,active,created_at FROM devices ORDER BY id DESC",
    )
    .all() as Omit<Device, "token">[];
}
export function registerDevice(
  token: string,
  platform: string,
  segment: string,
) {
  if (
    token.length < 20 ||
    token.length > 4096 ||
    !["android", "ios"].includes(platform) ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(segment)
  )
    throw new Error("Invalid device registration.");
  db.prepare(
    `INSERT INTO devices(token,platform,segment,created_at) VALUES(?,?,?,?) ON CONFLICT(token) DO UPDATE SET platform=excluded.platform,segment=excluded.segment,active=1`,
  ).run(token, platform, segment, new Date().toISOString());
}
export function unregisterDevice(token: string) {
  db.prepare("UPDATE devices SET active=0 WHERE token=?").run(token);
}
export function createMobilePairingCode() {
  const code = randomBytes(8).toString("hex").toUpperCase();
  const expiresAt = Date.now() + 10 * 60000;
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("DELETE FROM mobile_pairing_codes").run();
    db.prepare(
      "INSERT INTO mobile_pairing_codes(code_hash,expires_at) VALUES(?,?)",
    ).run(digest(code), expiresAt);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { code, expiresAt };
}
function validateMobileToken(token: string) {
  if (!/^[A-Za-z0-9:_-]{20,4096}$/.test(token))
    throw new Error("رمز FCM غير صالح.");
}
export function pairMobileDevice(
  code: string,
  token: string,
  platform: string,
) {
  validateMobileToken(token);
  if (platform !== "android")
    throw new Error("النسخة الحالية مخصصة لاختبار Android.");
  const normalized = code.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-F0-9]{16}$/.test(normalized))
    throw new Error("رمز الربط غير صالح أو منتهي.");
  db.exec("BEGIN IMMEDIATE");
  try {
    const removed = db
      .prepare(
        "DELETE FROM mobile_pairing_codes WHERE code_hash=? AND expires_at>?",
      )
      .run(digest(normalized), Date.now());
    if (removed.changes !== 1)
      throw new Error(
        "رمز الربط غير صالح أو منتهي. أنشئ رمزًا جديدًا من اللوحة.",
      );
    registerDevice(token, platform, "test");
    const device = db
      .prepare("SELECT id FROM devices WHERE token=?")
      .get(token) as { id: number };
    db.prepare(
      "DELETE FROM mobile_sessions WHERE device_id=? OR expires_at<=?",
    ).run(device.id, Date.now());
    const credential = randomBytes(32).toString("hex");
    db.prepare(
      "INSERT INTO mobile_sessions(credential_hash,device_id,expires_at) VALUES(?,?,?)",
    ).run(digest(credential), device.id, Date.now() + 30 * 86400000);
    db.exec("COMMIT");
    return { deviceId: device.id, credential, segment: "test" };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
export function mobileSessionDevice(credential: string): number | null {
  if (!/^[a-f0-9]{64}$/.test(credential)) return null;
  const row = db
    .prepare(
      "SELECT device_id FROM mobile_sessions WHERE credential_hash=? AND expires_at>?",
    )
    .get(digest(credential), Date.now()) as { device_id: number } | undefined;
  return row?.device_id || null;
}
export function updateMobileToken(credential: string, token: string) {
  validateMobileToken(token);
  const id = mobileSessionDevice(credential);
  if (!id) throw new Error("أعد ربط الجهاز؛ جلسة الربط غير صالحة.");
  const duplicate = db
    .prepare("SELECT id FROM devices WHERE token=? AND id!=?")
    .get(token, id);
  if (duplicate)
    throw new Error("هذا الرمز مرتبط بجهاز آخر. أعد الربط من اللوحة.");
  db.prepare("UPDATE devices SET token=?,active=1 WHERE id=?").run(token, id);
  return id;
}
export function disconnectMobileDevice(credential: string) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const id = mobileSessionDevice(credential);
    if (!id) throw new Error("جلسة الجهاز غير صالحة.");
    db.prepare("UPDATE devices SET active=0 WHERE id=?").run(id);
    db.prepare("DELETE FROM mobile_sessions WHERE device_id=?").run(id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
export function audience(
  campaign: Pick<Campaign, "segment" | "platform">,
): Device[] {
  return db
    .prepare(
      "SELECT * FROM devices WHERE active=1 AND (?='all' OR segment=?) AND (?='all' OR platform=?)",
    )
    .all(
      campaign.segment,
      campaign.segment,
      campaign.platform,
      campaign.platform,
    ) as Device[];
}
export function saveCampaign(input: {
  id?: number;
  name: string;
  title: string;
  body: string;
  segment: string;
  platform: string;
  link: string;
  scheduled_at: string | null;
}) {
  if (
    !input.name.trim() ||
    input.name.length > 120 ||
    !input.title.trim() ||
    input.title.length > 100 ||
    !input.body.trim() ||
    input.body.length > 500
  )
    throw new Error("أدخل اسم الحملة وعنوان الإشعار ونصه ضمن الحدود المحددة.");
  if (
    !["all", "android", "ios"].includes(input.platform) ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(input.segment)
  )
    throw new Error("الجمهور المحدد غير صالح.");
  if (
    input.link &&
    (input.link.length > 1000 ||
      !/^(https:\/\/|[a-z][a-z0-9+.-]*:\/\/)/i.test(input.link) ||
      /^(javascript|data|file):/i.test(input.link))
  )
    throw new Error("أدخل رابط HTTPS أو رابط تطبيق صالحًا.");
  let scheduled: string | null = null;
  if (input.scheduled_at) {
    const date = new Date(input.scheduled_at);
    if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now())
      throw new Error("اختر موعدًا في المستقبل.");
    scheduled = date.toISOString();
  }
  const old = input.id ? getCampaign(input.id) : undefined;
  if (input.id && (!old || !["draft", "scheduled"].includes(old.status)))
    throw new Error("لا يمكن تعديل حملة بدأ إرسالها.");
  const now = new Date().toISOString();
  const status = scheduled ? "scheduled" : "draft";
  if (input.id) {
    const result = db
      .prepare(
        "UPDATE campaigns SET name=?,title=?,body=?,segment=?,platform=?,link=?,scheduled_at=?,status=?,updated_at=? WHERE id=? AND status IN ('draft','scheduled')",
      )
      .run(
        input.name.trim(),
        input.title.trim(),
        input.body.trim(),
        input.segment,
        input.platform,
        input.link,
        scheduled,
        status,
        now,
        input.id,
      );
    if (result.changes !== 1)
      throw new Error("بدأ إرسال الحملة. لم تُحفظ التعديلات.");
    return input.id;
  }
  return Number(
    db
      .prepare(
        "INSERT INTO campaigns(name,title,body,segment,platform,link,scheduled_at,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        input.name.trim(),
        input.title.trim(),
        input.body.trim(),
        input.segment,
        input.platform,
        input.link,
        scheduled,
        status,
        now,
        now,
      ).lastInsertRowid,
  );
}
export function removeCampaign(id: number) {
  db.prepare(
    "DELETE FROM campaigns WHERE id=? AND status IN ('draft','scheduled')",
  ).run(id);
}
export function dueCampaigns(): Campaign[] {
  return db
    .prepare(
      "SELECT * FROM campaigns WHERE status='scheduled' AND scheduled_at<=? ORDER BY scheduled_at",
    )
    .all(new Date().toISOString()) as Campaign[];
}
export function claimCampaign(id: number) {
  const row = db
    .prepare(
      "UPDATE campaigns SET status='sending',error=NULL,updated_at=? WHERE id=? AND status IN ('draft','scheduled') RETURNING *",
    )
    .get(new Date().toISOString(), id) as Campaign | undefined;
  return row ? { ...row } : undefined;
}
export function recordDelivery(
  campaignId: number,
  deviceId: number,
  status: string,
  error: string | null,
  providerId: string | null,
) {
  db.prepare(
    "INSERT INTO deliveries(campaign_id,device_id,status,error,provider_id,created_at) VALUES(?,?,?,?,?,?)",
  ).run(
    campaignId,
    deviceId,
    status,
    error,
    providerId,
    new Date().toISOString(),
  );
}
export function deactivateDevice(id: number) {
  db.prepare("UPDATE devices SET active=0 WHERE id=?").run(id);
}
export function finishCampaign(
  id: number,
  accepted: number,
  failed: number,
  error: string | null,
) {
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE campaigns SET status=?,accepted=?,failed=?,error=?,completed_at=?,updated_at=? WHERE id=?",
  ).run(
    accepted ? (failed ? "partial" : "sent") : "failed",
    accepted,
    failed,
    error,
    now,
    now,
    id,
  );
}
export function campaignDeliveries(id: number) {
  return db
    .prepare(
      "SELECT d.id,d.status,d.error,d.created_at,v.platform FROM deliveries d JOIN devices v ON v.id=d.device_id WHERE campaign_id=? ORDER BY d.id DESC",
    )
    .all(id) as {
    id: number;
    status: string;
    error: string | null;
    created_at: string;
    platform: string;
  }[];
}
