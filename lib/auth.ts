import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionAdmin, hasAdmin, createSession } from "./store";
export const SESSION_COOKIE = "cms_session";
export async function currentAdmin() {
  return sessionAdmin((await cookies()).get(SESSION_COOKIE)?.value);
}
export async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) redirect(hasAdmin() ? "/login" : "/setup");
  return admin;
}
export async function signIn(id: number) {
  (await cookies()).set(SESSION_COOKIE, createSession(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.CMS_SECURE_COOKIES === "true",
    maxAge: 7 * 86400,
    path: "/",
  });
}
