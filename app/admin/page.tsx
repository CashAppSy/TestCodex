import Link from "next/link";
import Icon from "@/components/icon";
import { requireAdmin } from "@/lib/auth";
import { listCampaigns, listDevices } from "@/lib/store";
import { providerReady } from "@/lib/push";
import CampaignTable from "@/components/campaign-table";
export default async function Dashboard() {
  const admin = await requireAdmin();
  const campaigns = listCampaigns();
  const devices = listDevices().filter((d) => d.active);
  const ready = providerReady();
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">كل ما تحتاجه، في مكان واحد</span>
          <h1>
            أهلًا، {admin.name.split(" ")[0]}{" "}
            <span className="greeting-dot">✳</span>
          </h1>
          <p className="muted">
            لنصنع تواصلًا يستحق أن يفتح جمهورك الإشعار من أجله.
          </p>
        </div>
        <Link className="button" href="/admin/campaigns/new">
          + إنشاء حملة
        </Link>
      </div>
      <section className="welcome-banner">
        <div>
          <span className="eyebrow">الرسالة المناسبة. في الوقت المناسب.</span>
          <h2>
            قرّب المسافة بينك
            <br />
            وبين جمهورك.
          </h2>
          <p>
            أنشئ حملات إشعارات لتطبيقك، حدد من تصله رسالتك،
            <br />
            وتابع كل طلب إرسال من مكان واحد.
          </p>
          <Link href="/admin/campaigns/new">ابدأ حملة جديدة ←</Link>
        </div>
        <div className="banner-art" aria-hidden="true">
          <div className="art-orbit" />
          <div className="art-phone">
            <div className="phone-notch" />
            <span>9:41</span>
            <div className="phone-notification">
              <b>◉ نبض</b>
              <strong>لديك شيء يستحق المشاركة ✦</strong>
              <small>رسالتك القادمة تبدأ من هنا.</small>
            </div>
          </div>
          <div className="art-circle">
            <Icon name="arrow" size={28} />
          </div>
          <span className="art-spark">✧</span>
        </div>
      </section>
      <section className="stats-grid" aria-label="إحصائيات">
        {[
          {
            label: "إجمالي الحملات",
            value: campaigns.length,
            icon: "campaign",
            style: "purple",
            detail: "أفكارك أصبحت رسائل",
          },
          {
            label: "الأجهزة النشطة",
            value: devices.length,
            icon: "device",
            style: "green",
            detail: "جمهورك المتصل بالتطبيق",
          },
          {
            label: "الطلبات المقبولة",
            value: campaigns.reduce((s, c) => s + c.accepted, 0),
            icon: "check",
            style: "amber",
            detail: "قبِلها مزوّد الإشعارات",
          },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <div>
              <span>{s.label}</span>
              <span className={`stat-icon ${s.style}`}>
                <Icon name={s.icon} size={18} />
              </span>
            </div>
            <strong>{s.value.toString().padStart(2, "0")}</strong>
            <p>{s.detail}</p>
          </div>
        ))}
      </section>
      {!ready && (
        <Link href="/admin/settings" className="integration-notice">
          <span>⚙</span>
          <div>
            <strong>خطوة واحدة قبل أول إرسال</strong>
            <p>
              اربط مزوّد الإشعارات وسجّل أجهزة التطبيق. يمكنك تجهيز الحملات
              الآن.
            </p>
          </div>
          <span>إعداد الربط ←</span>
        </Link>
      )}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>آخر الحملات</h2>
            <p className="muted">كل رسالة، من الفكرة إلى الإرسال.</p>
          </div>
          <Link className="text-link" href="/admin/campaigns">
            عرض كل الحملات ←
          </Link>
        </div>
        <CampaignTable items={campaigns.slice(0, 5)} />
      </section>
      <div className="dashboard-note">
        <span>✦</span> الإشعار الجيد يبدأ بسؤال: هل هذه الرسالة مفيدة لجمهوري؟
      </div>
    </>
  );
}
