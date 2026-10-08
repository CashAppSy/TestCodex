import { readFileSync } from "node:fs";
const expected = process.env.ANDROID_PACKAGE || "com.nabdh.testapp";
const file = process.env.GOOGLE_SERVICES_FILE || "./google-services.json";
try {
  const data = JSON.parse(readFileSync(file, "utf8"));
  if (
    !data.project_info?.project_id ||
    !data.client?.some(
      (client) =>
        client.client_info?.android_client_info?.package_name === expected,
    )
  ) {
    throw new Error(
      "الملف لا يحتوي مشروعًا صالحًا وعميل Android يطابق اسم الحزمة.",
    );
  }
  console.log(
    `Firebase client configuration matches Android package ${expected}.`,
  );
} catch {
  console.error(
    `أضف ملف إعداد Android google-services.json من Firebase للحزمة ${expected}. لا تستخدم ملف حساب الخدمة بدلًا منه.`,
  );
  process.exitCode = 1;
}
