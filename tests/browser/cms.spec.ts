import { test, expect } from "@playwright/test";
test("protected dashboard, initial account, draft campaign, schedule, device API, and sign out", async ({
  page,
  request,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/setup/);
  await page.getByLabel("الاسم", { exact: true }).fill("أحمد");
  await page.getByLabel("البريد الإلكتروني").fill("admin@example.com");
  await page.getByLabel("كلمة المرور").fill("browser-test-password");
  await page.getByRole("button", { name: "إنشاء حساب المدير" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { name: /أهلًا، أحمد/ }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "+ إنشاء حملة", exact: true })
    .first()
    .click();
  await page.locator('input[name="name"]').fill("حملة تجريبية");
  await page.locator('input[name="title"]').fill("تحديث جديد");
  await page.locator('textarea[name="body"]').fill("جرّب الميزة الجديدة اليوم");
  await expect(page.locator(".notification-preview")).toContainText(
    "تحديث جديد",
  );
  await page.getByRole("button", { name: "حفظ المسودة" }).click();
  await expect(page).toHaveURL(/\/admin\/campaigns\/\d+\?saved=1/);
  await expect(page.getByRole("status")).toContainText("تم حفظ");
  await expect(page.getByRole("button", { name: "إرسال الآن" })).toBeDisabled();
  const unauthorized = await request.post("/api/devices", {
    data: { token: "x".repeat(40), platform: "android" },
  });
  expect(unauthorized.status()).toBe(401);
  const registration = await request.post("/api/devices", {
    headers: {
      Authorization: "Bearer test-only-device-api-key-32-characters-long",
    },
    data: { token: "x".repeat(40), platform: "android", segment: "customers" },
  });
  expect(registration.status()).toBe(200);
  const oversized = await request.post("/api/devices", {
    headers: {
      Authorization: "Bearer test-only-device-api-key-32-characters-long",
    },
    data: { token: "x".repeat(9000), platform: "android" },
  });
  expect(oversized.status()).toBe(413);
  const future = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
  await page.locator('input[type="datetime-local"]').fill(future);
  await page.getByRole("button", { name: "حفظ وجدولة" }).click();
  await expect(page.locator(".page-heading .badge")).toHaveText("مجدولة");
  await page
    .getByRole("link", { name: "الأجهزة والجمهور", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "1 جهاز مسجل" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "إنشاء رمز ربط" }).click();
  const code = await page.getByTestId("pairing-code").innerText();
  const pair = await request.post("/api/mobile/pair", {
    data: { code, token: "mobile-test-token-".repeat(4), platform: "android" },
  });
  expect(pair.status()).toBe(200);
  const session = await pair.json();
  expect(session.segment).toBe("test");
  const replay = await request.post("/api/mobile/pair", {
    data: { code, token: "mobile-other-token-".repeat(4), platform: "android" },
  });
  expect(replay.status()).toBe(400);
  const denied = await request.put("/api/mobile/device", {
    data: { token: "new-test-token-".repeat(4) },
  });
  expect(denied.status()).toBe(401);
  const updated = await request.put("/api/mobile/device", {
    headers: { Authorization: `Bearer ${session.credential}` },
    data: { token: "new-test-token-".repeat(4) },
  });
  expect(updated.status()).toBe(200);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "2 جهاز مسجل" }),
  ).toBeVisible();
  const disconnected = await request.delete("/api/mobile/device", {
    headers: { Authorization: `Bearer ${session.credential}` },
  });
  expect(disconnected.status()).toBe(200);
  const revoked = await request.put("/api/mobile/device", {
    headers: { Authorization: `Bearer ${session.credential}` },
    data: { token: "new-test-token-".repeat(4) },
  });
  expect(revoked.status()).toBe(401);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("link", { name: "نظرة عامة", exact: true }).click();
  await page.screenshot({ path: "/tmp/nabdh-dashboard.png", fullPage: true });
  await page.getByRole("button", { name: "تسجيل الخروج" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/admin/campaigns");
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("البريد الإلكتروني").fill("admin@example.com");
  await page.getByLabel("كلمة المرور").fill("wrong-password");
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(page.locator(".notice.error")).toBeVisible();
  await expect(page.getByLabel("البريد الإلكتروني")).toHaveValue(
    "admin@example.com",
  );
  await page.getByLabel("كلمة المرور").fill("browser-test-password");
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole("link", { name: "الحملات", exact: true }).click();
  await page
    .getByRole("link", { name: "عرض حملة تجريبية", exact: true })
    .click();
  await page.locator('input[type="datetime-local"]').fill("");
  await page.getByRole("button", { name: "حفظ المسودة" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "حذف الحملة", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/campaigns$/);
  await expect(
    page.getByRole("heading", { name: "أول رسالة تبدأ من هنا." }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "تسجيل الخروج" }).click();
  await expect(page).toHaveURL(/\/login/);
});
