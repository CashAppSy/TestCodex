import { requireAdmin } from "@/lib/auth";
import { listDevices } from "@/lib/store";
import Link from "next/link";
import MobilePairing from "@/components/mobile-pairing";
export default async function Devices() {
  await requireAdmin();
  const devices = listDevices();
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">جمهورك المتصل</span>
          <h1>الأجهزة والجمهور.</h1>
          <p className="muted">
            يتم تسجيل الأجهزة من خادم تطبيقك عبر واجهة الربط.
          </p>
        </div>
        <Link className="button secondary" href="/admin/settings">
          تعليمات الربط ←
        </Link>
      </div>
      <MobilePairing />
      <section className="panel">
        <div className="panel-heading">
          <h2>{devices.length} جهاز مسجل</h2>
        </div>
        {!devices.length ? (
          <div className="empty-state">
            <span className="empty-icon">▯</span>
            <h3>جمهورك يبدأ بأول جهاز.</h3>
            <p>اربط تطبيقك وأرسل رموز الإشعارات إلى API لتظهر الأجهزة هنا.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>الجهاز</th>
                  <th>النظام</th>
                  <th>الشريحة</th>
                  <th>الحالة</th>
                  <th>تاريخ التسجيل</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id}>
                    <td>#{d.id}</td>
                    <td>{d.platform}</td>
                    <td>{d.segment}</td>
                    <td>
                      <span className={`badge ${d.active ? "sent" : "draft"}`}>
                        {d.active ? "نشط" : "غير نشط"}
                      </span>
                    </td>
                    <td>{new Date(d.created_at).toLocaleDateString("ar")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
