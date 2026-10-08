import Link from "next/link";
import Icon from "./icon";
import type { Campaign } from "@/lib/store";
import { labels } from "./campaign-labels";
export default function CampaignTable({ items }: { items: Campaign[] }) {
  if (!items.length)
    return (
      <div className="empty-state">
        <span className="empty-icon">↗</span>
        <h3>أول رسالة تبدأ من هنا.</h3>
        <p>أنشئ حملتك، اختر جمهورك، وأرسل في اللحظة المناسبة.</p>
        <Link className="button" href="/admin/campaigns/new">
          + إنشاء حملة
        </Link>
      </div>
    );
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>الحملة</th>
            <th>الجمهور</th>
            <th>الحالة</th>
            <th>طلبات مقبولة</th>
            <th>آخر تحديث</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id}>
              <td>
                <Link
                  className="content-title"
                  href={`/admin/campaigns/${c.id}`}
                >
                  <span className="document-icon">
                    <Icon name="campaign" size={16} />
                  </span>
                  <span>
                    <strong>{c.name}</strong>
                    <small>{c.title}</small>
                  </span>
                </Link>
              </td>
              <td>
                {c.platform === "all" ? "كل الأنظمة" : c.platform}{" "}
                <small className="muted">
                  · {c.segment === "all" ? "كل الشرائح" : c.segment}
                </small>
              </td>
              <td>
                <span className={`badge ${c.status}`}>
                  <span className="dot" />
                  {labels[c.status] || c.status}
                </span>
              </td>
              <td>{c.accepted}</td>
              <td className="muted">
                {new Date(c.updated_at).toLocaleDateString("ar", {
                  timeZone: "UTC",
                  month: "short",
                  day: "numeric",
                })}
              </td>
              <td>
                <Link
                  aria-label={`عرض ${c.name}`}
                  href={`/admin/campaigns/${c.id}`}
                  className="row-arrow"
                >
                  ←
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
