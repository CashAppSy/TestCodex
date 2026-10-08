import { readFileSync } from "node:fs";
const raw = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
const id = raw.match(/"database_id"\s*:\s*"([a-f0-9-]+)"/i)?.[1];
if (
  !id ||
  id === "00000000-0000-0000-0000-000000000000" ||
  !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)
) {
  console.error(
    "أضف Database ID الحقيقي لقاعدة nabdh-cms في cloudflare/wrangler.jsonc قبل النشر.",
  );
  process.exitCode = 1;
}
