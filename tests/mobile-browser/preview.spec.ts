import { test, expect } from "@playwright/test";
test("mobile preview makes simulation explicit, retains inbox, and opens safe campaign deep link", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(page.getByText("معاينة الواجهة", { exact: true })).toBeVisible();
  await expect(page.getByText("أول إشعار، أول تواصل.")).toBeVisible();
  await page.getByRole("button", { name: "تجربة إشعار محلي" }).click();
  await expect(
    page.getByRole("button", { name: "فتح إشعار شيء جديد ينتظرك ✨" }),
  ).toBeVisible();
  await expect(page.getByText("محاكاة محلية", { exact: true })).toHaveCount(2);
  await page.screenshot({
    path: "/tmp/nabdh-mobile-inbox.png",
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "فتح إشعار شيء جديد ينتظرك ✨" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "فتح إشعار شيء جديد ينتظرك ✨" })
    .click();
  await expect(
    page.getByText(
      "هذا إشعار محاكاة داخل التطبيق لتجربة الواجهة. لم يُرسل من Firebase.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "فتح رابط الحملة" }).click();
  await expect(
    page.getByRole("heading", { name: "صفحة الحملة التجريبية" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "العودة إلى الإشعارات" }).click();
  await page.getByRole("tab", { name: "الحساب" }).click();
  await expect(
    page.getByRole("heading", { name: "تسجيل الدخول", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "دخول", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "مستخدم جديد؟ إنشاء حساب", exact: true })
    .click();
  await expect(page.getByLabel("الاسم", { exact: true })).toBeVisible();
  await page.getByLabel("الاسم", { exact: true }).fill("مستخدم تجريبي");
  await page.getByLabel("رقم الهاتف", { exact: true }).fill("+963944000111");
  await page.getByLabel("كلمة المرور", { exact: true }).fill("test-password");
  await page
    .getByLabel("تأكيد كلمة المرور", { exact: true })
    .fill("test-password");
  await expect(
    page.getByRole("button", {
      name: "إنشاء الحساب وتسجيل الدخول",
      exact: true,
    }),
  ).toBeDisabled();
  await page.screenshot({
    path: "/tmp/cash-mobile-register-preview.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "لدي حساب — تسجيل الدخول", exact: true })
    .click();
  await expect(page.getByLabel("كلمة المرور", { exact: true })).toHaveValue("");
  await expect(
    page.getByLabel("تأكيد كلمة المرور", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "ربط تجريبي برمز من اللوحة", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "الربط متاح في نسخة Android" }),
  ).toBeDisabled();
  await page.screenshot({
    path: "/tmp/nabdh-mobile-connect.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("tab", { name: "عن التطبيق" }).click();
  await expect(page.getByText(/أنت في معاينة الويب/)).toBeVisible();
  await page.getByRole("tab", { name: "الإشعارات" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "مسح السجل" }).click();
  await expect(page.getByText("أول إشعار، أول تواصل.")).toBeVisible();
  expect(errors).toEqual([]);
});
