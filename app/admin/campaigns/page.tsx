import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listCampaigns } from "@/lib/store";
import CampaignTable from "@/components/campaign-table";
export default async function Campaigns({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const items = listCampaigns().filter(
    (c) =>
      (!query.q || c.name.toLowerCase().includes(query.q.toLowerCase())) &&
      (!query.status || c.status === query.status),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">مركز التواصل</span>
          <h1>حملاتك.</h1>
          <p className="muted">خطط، أرسل، وتابع الأثر خطوة بخطوة.</p>
        </div>
        <Link className="button" href="/admin/campaigns/new">
          + إنشاء حملة
        </Link>
      </div>
      <section className="panel">
        <div className="filters">
          <h2>كل الحملات</h2>
          <form className="search-form">
            <input
              name="q"
              placeholder="ابحث عن حملة…"
              aria-label="البحث"
              defaultValue={query.q}
            />
            <select
              name="status"
              aria-label="الحالة"
              defaultValue={query.status || ""}
            >
              <option value="">كل الحالات</option>
              <option value="draft">مسودة</option>
              <option value="scheduled">مجدولة</option>
              <option value="sent">تم الإرسال</option>
              <option value="failed">فشل الإرسال</option>
              <option value="partial">إرسال جزئي</option>
            </select>
            <button className="button secondary">بحث</button>
          </form>
        </div>
        <CampaignTable items={items} />
        <div className="table-footer">{items.length} حملة</div>
      </section>
    </>
  );
}
