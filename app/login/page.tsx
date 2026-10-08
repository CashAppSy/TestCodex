import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdmin } from "@/lib/store";
import { currentAdmin } from "@/lib/auth";
import AuthForm from "@/components/auth-form";
export const dynamic = "force-dynamic";
export default async function Login() {
  if (!hasAdmin()) redirect("/setup");
  if (await currentAdmin()) redirect("/admin");
  return (
    <main className="auth-page">
      <Link href="/" className="brand">
        <span className="brand-mark">ن</span> نبض
      </Link>
      <section className="auth-card">
        <span className="eyebrow">لوحة إدارة الإشعارات</span>
        <h1>أهلًا بعودتك.</h1>
        <p className="muted">سجّل دخولك لمتابعة حملاتك والتواصل مع جمهورك.</p>
        <AuthForm />
      </section>
      <Link className="muted small" href="/">
        العودة
      </Link>
    </main>
  );
}
