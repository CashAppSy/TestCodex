import { requireAdmin } from "@/lib/auth";
import { providerReady } from "@/lib/push";
import CampaignEditor from "@/components/campaign-editor";
export default async function NewCampaign() {
  await requireAdmin();
  return <CampaignEditor audienceCount={0} ready={providerReady()} />;
}
