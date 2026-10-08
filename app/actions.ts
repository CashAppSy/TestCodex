"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, signIn, SESSION_COOKIE } from "@/lib/auth";
import {
  authenticate,
  createAdmin,
  deleteSession,
  removeCampaign,
  saveCampaign,
  createMobilePairingCode,
} from "@/lib/store";
export type FormState = { error: string };
const field = (form: FormData, name: string) => String(form.get(name) || "");
export type PairingState = { code: string; expiresAt: number; error: string };
export async function mobilePairingAction(
  _state: PairingState,
): Promise<PairingState> {
  await requireAdmin();
  const result = createMobilePairingCode();
  return { ...result, error: "" };
}
export async function setupAction(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  let id: number;
  try {
    id = createAdmin(
      field(form, "name"),
      field(form, "email"),
      field(form, "password"),
    ).id;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "تعذر إنشاء الحساب.",
    };
  }
  await signIn(id);
  redirect("/admin");
}
export async function loginAction(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const admin = authenticate(field(form, "email"), field(form, "password"));
  if (!admin)
    return {
      error:
        "البريد أو كلمة المرور غير صحيحين، أو تجاوزت عدد المحاولات. انتظر 15 دقيقة إذا حُظر الدخول.",
    };
  await signIn(admin.id);
  redirect("/admin");
}
export async function logoutAction() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) deleteSession(token);
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
export async function saveCampaignAction(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  await requireAdmin();
  let id: number;
  try {
    const raw = field(form, "id");
    if (raw && (!/^\d+$/.test(raw) || Number(raw) < 1))
      throw new Error("معرّف غير صالح.");
    id = saveCampaign({
      id: raw ? Number(raw) : undefined,
      name: field(form, "name"),
      title: field(form, "title"),
      body: field(form, "body"),
      segment: field(form, "segment") || "all",
      platform: field(form, "platform"),
      link: field(form, "link"),
      scheduled_at: field(form, "scheduled_at") || null,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "تعذر حفظ الحملة.",
    };
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/campaigns/${id}?saved=1`);
}
export async function deleteCampaignAction(form: FormData) {
  await requireAdmin();
  removeCampaign(Number(field(form, "id")));
  revalidatePath("/admin", "layout");
  redirect("/admin/campaigns");
}
export async function sendCampaignAction(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  await requireAdmin();
  try {
    const { dispatchCampaign } = await import("@/lib/push");
    await dispatchCampaign(Number(field(form, "id")));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "تعذر إرسال الحملة.",
    };
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/campaigns/${field(form, "id")}?sent=1`);
}
