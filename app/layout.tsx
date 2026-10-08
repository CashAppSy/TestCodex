import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "نبض — إدارة حملات الإشعارات", template: "%s · نبض" },
  description: "أنشئ حملات إشعارات تطبيقك، حدد جمهورك، وتابع نتائج الإرسال.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
