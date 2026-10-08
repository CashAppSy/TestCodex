import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  audience,
  claimCampaign,
  deactivateDevice,
  finishCampaign,
  getCampaign,
  recordDelivery,
  type Campaign,
  type Device,
} from "./store.ts";

type Credentials = {
  project_id: string;
  client_email: string;
  private_key: string;
};
function credentials(): Credentials {
  const raw =
    process.env.FCM_SERVICE_ACCOUNT_JSON ||
    (process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? readFileSync(
          /* turbopackIgnore: true */ process.env
            .GOOGLE_APPLICATION_CREDENTIALS,
          "utf8",
        )
      : "");
  if (!raw)
    throw new Error(
      "Firebase غير مهيأ. أضف بيانات حساب الخدمة على الخادم أولًا.",
    );
  const value = JSON.parse(raw) as Credentials;
  if (
    !value.project_id ||
    !/^[a-z][a-z0-9-]{4,62}$/.test(value.project_id) ||
    !value.client_email ||
    !value.private_key
  )
    throw new Error("بيانات حساب Firebase غير صالحة.");
  return value;
}
export function providerReady() {
  if (process.env.PUSH_PROVIDER === "expo") return true;
  try {
    credentials();
    return true;
  } catch {
    return false;
  }
}
let cached: { token: string; expires: number } | undefined;
async function accessToken() {
  if (cached && cached.expires > Date.now() + 60000) return cached.token;
  const account = credentials();
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: object) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: account.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(account.private_key, "base64url");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(`Firebase authentication failed (${response.status}).`);
  const result = await response.json();
  if (!result.access_token)
    throw new Error("Firebase did not return an access token.");
  cached = {
    token: result.access_token,
    expires: Date.now() + Number(result.expires_in || 3600) * 1000,
  };
  return cached.token;
}
export type PushResult = {
  accepted: boolean;
  invalid?: boolean;
  id?: string;
  error?: string;
};
export async function sendPush(
  device: Device,
  campaign: Campaign,
): Promise<PushResult> {
  if (process.env.PUSH_PROVIDER === "expo") {
    if (!/^(ExponentPushToken|ExpoPushToken)\[.+\]$/.test(device.token))
      return {
        accepted: false,
        invalid: true,
        error: "Invalid Expo push token",
      };
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.EXPO_ACCESS_TOKEN
          ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        to: device.token,
        title: campaign.title,
        body: campaign.body,
        sound: "default",
        data: { campaignId: String(campaign.id), url: campaign.link },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      return {
        accepted: false,
        error: `Expo request failed (${response.status})`,
      };
    const { data } = await response.json();
    return data?.status === "ok"
      ? { accepted: true, id: data.id }
      : {
          accepted: false,
          invalid: data?.details?.error === "DeviceNotRegistered",
          error: data?.details?.error || "Expo rejected notification",
        };
  }
  const account = credentials();
  const token = await accessToken();
  const payload = {
    message: {
      token: device.token,
      notification: { title: campaign.title, body: campaign.body },
      data: { campaignId: String(campaign.id), url: campaign.link },
      android: { priority: "high" },
      apns: { payload: { aps: { sound: "default" } } },
    },
  };
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    },
  );
  const data = await response.json();
  const code = data.error?.details?.find(
    (detail: { errorCode?: string }) => detail.errorCode,
  )?.errorCode;
  return response.ok
    ? { accepted: true, id: data.name }
    : {
        accepted: false,
        invalid: code === "UNREGISTERED",
        error: code || `FCM request failed (${response.status})`,
      };
}
export async function dispatchCampaign(id: number, send = sendPush) {
  const initial = getCampaign(id);
  if (!initial) throw new Error("الحملة غير موجودة.");
  if (!providerReady() && send === sendPush)
    throw new Error("أكمل إعداد مزوّد الإشعارات قبل الإرسال.");
  if (!audience(initial).length)
    throw new Error("لا توجد أجهزة نشطة ضمن الجمهور المحدد.");
  const campaign = claimCampaign(id);
  if (!campaign) throw new Error("بدأ إرسال هذه الحملة بالفعل.");
  const devices = audience(campaign);
  let accepted = 0,
    failed = 0;
  // Never automatically retry an ambiguous network failure: the provider may already have accepted it.
  try {
    for (let offset = 0; offset < devices.length; offset += 10) {
      await Promise.all(
        devices.slice(offset, offset + 10).map(async (device) => {
          let result: PushResult;
          try {
            result = await send(device, campaign);
          } catch {
            result = {
              accepted: false,
              error:
                "Provider request failed or timed out; acceptance is unknown.",
            };
          }
          if (result.accepted) accepted++;
          else failed++;
          recordDelivery(
            id,
            device.id,
            result.accepted ? "accepted" : "failed",
            result.error || null,
            result.id || null,
          );
          if (result.invalid) deactivateDevice(device.id);
        }),
      );
    }
    finishCampaign(
      id,
      accepted,
      failed,
      failed ? "Some requests failed. Review the delivery log." : null,
    );
  } catch (error) {
    finishCampaign(
      id,
      accepted,
      failed,
      "Dispatch interrupted. Some outcomes may be unknown.",
    );
    throw error;
  }
  return { accepted, failed };
}
