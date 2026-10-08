import { dueCampaigns } from "../lib/store.ts";
import { dispatchCampaign, providerReady } from "../lib/push.ts";
let stopped = false;
process.on("SIGTERM", () => {
  stopped = true;
});
process.on("SIGINT", () => {
  stopped = true;
});
console.log("Campaign scheduler started. Checking every 30 seconds.");
while (!stopped) {
  if (providerReady())
    for (const campaign of dueCampaigns()) {
      try {
        await dispatchCampaign(campaign.id);
        console.log(`Processed campaign ${campaign.id}`);
      } catch (error) {
        console.error(
          `Campaign ${campaign.id}: ${error instanceof Error ? error.message : "failed"}`,
        );
      }
    }
  await new Promise((resolve) => setTimeout(resolve, 30000));
}
