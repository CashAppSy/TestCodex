import { requireAdmin } from "@/lib/auth";
import Sidebar from "@/components/sidebar";
import { logoutAction } from "@/app/actions";
export const dynamic = "force-dynamic";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  return (
    <div className="admin-shell">
      <Sidebar name={admin.name} email={admin.email} />
      <div className="admin-main">
        <header className="topbar">
          <span>
            مساحة التطبيق <span className="muted">/ مركز الإشعارات</span>
          </span>
          <span className="topbar-tag">
            <span className="dot" /> مساحتك الخاصة
          </span>
          <form action={logoutAction} className="mobile-logout">
            <button aria-label="تسجيل الخروج">خروج ↪</button>
          </form>
        </header>
        <main className="admin-body">{children}</main>
        <footer className="admin-footer">
          تواصل أقرب. تجربة أفضل.<span>نبض · 0.1</span>
        </footer>
      </div>
    </div>
  );
}
