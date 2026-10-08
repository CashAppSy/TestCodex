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
  await page.getByRole("tab", { name: "ربط اللوحة" }).click();
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
