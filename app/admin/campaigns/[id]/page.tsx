import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { audience, campaignDeliveries, getCampaign } from "@/lib/store";
import { providerReady } from "@/lib/push";
import CampaignEditor from "@/components/campaign-editor";
export default async function CampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const campaign = getCampaign(Number(id));
  if (!campaign) notFound();
  const logs = campaignDeliveries(campaign.id);
  return (
    <>
      <CampaignEditor
        key={campaign.updated_at}
        campaign={campaign}
        saved={(await searchParams).saved === "1"}
        audienceCount={audience(campaign).length}
        ready={providerReady()}
      />
      {logs.length > 0 && (
        <section className="panel">
          <div className="panel-heading">
            <h2>سجل طلبات الإرسال</h2>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>الطلب</th>
                  <th>النظام</th>
                  <th>النتيجة</th>
                  <th>التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>#{log.id}</td>
                    <td>{log.platform}</td>
                    <td>
                      {log.status === "accepted"
                        ? "قبله المزوّد"
                        : "فشل / غير مؤكد"}
                    </td>
                    <td>{log.error || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
