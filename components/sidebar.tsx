"use client";
import Link from "next/link";
import Icon from "./icon";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions";
export default function Sidebar({ name }: { name: string; email: string }) {
  const path = usePathname();
  return (
    <aside className="sidebar">
      <Link href="/admin" className="brand">
        <span className="brand-mark">ن</span>نبض
        <span className="brand-caption">NABḌ</span>
      </Link>
      <div className="workspace">
        <span className="workspace-icon">◉</span>
        <div>
          <strong>مساحة التطبيق</strong>
          <span>إدارة الإشعارات</span>
        </div>
        <span className="dot" />
      </div>
      <p className="nav-label">مساحة العمل</p>
      <nav>
        <Link className={path === "/admin" ? "active" : ""} href="/admin">
          <span>
            <Icon name="overview" />
          </span>
          نظرة عامة
        </Link>
        <Link
          className={path.startsWith("/admin/campaigns") ? "active" : ""}
          href="/admin/campaigns"
        >
          <span>
            <Icon name="campaign" />
          </span>
          الحملات
        </Link>
        <Link
          className={path === "/admin/devices" ? "active" : ""}
          href="/admin/devices"
        >
          <span>
            <Icon name="device" />
          </span>
          الأجهزة والجمهور
        </Link>
        <Link
          className={path === "/admin/settings" ? "active" : ""}
          href="/admin/settings"
        >
          <span>
            <Icon name="settings" />
          </span>
          ربط التطبيق
        </Link>
      </nav>
      <div className="sidebar-bottom">
        <div className="tip">
          <span>✦</span>
          <strong>رسالة صغيرة، أثر كبير.</strong>
          <p>اختر الوقت المناسب، وأرسل لجمهورك ما يهمّه.</p>
          <Link href="/admin/campaigns/new">إنشاء حملة ←</Link>
        </div>
        <div className="profile">
          <span className="avatar">{name.charAt(0)}</span>
          <div>
            <strong>{name}</strong>
            <span>مدير المساحة</span>
          </div>
          <form action={logoutAction}>
            <button title="تسجيل الخروج" aria-label="تسجيل الخروج">
              <Icon name="logout" size={18} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
