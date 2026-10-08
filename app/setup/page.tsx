import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdmin } from "@/lib/store";
import AuthForm from "@/components/auth-form";
export const dynamic = "force-dynamic";
export default function Setup() {
  if (hasAdmin()) redirect("/login");
  return (
    <main className="auth-page">
      <Link href="/" className="brand">
        <span className="brand-mark">ن</span> نبض
      </Link>
      <section className="auth-card">
        <span className="eyebrow">مساحة جديدة لتطبيقك</span>
        <h1>
          تواصل يصل
          <br />
          في وقته.
        </h1>
        <p className="muted">
          أنشئ حساب المدير لبدء إدارة حملات إشعارات تطبيقك.
        </p>
        <AuthForm setup />
      </section>
      <p className="small muted">تطبيقك. جمهورك. رسالتك.</p>
    </main>
  );
}
