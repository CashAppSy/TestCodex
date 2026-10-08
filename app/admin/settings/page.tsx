import { requireAdmin } from "@/lib/auth";
import { providerReady } from "@/lib/push";
export default async function Settings() {
  await requireAdmin();
  const ready = providerReady();
  const api =
    !!process.env.CMS_DEVICE_API_KEY &&
    process.env.CMS_DEVICE_API_KEY.length >= 32;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">من اللوحة إلى تطبيقك</span>
          <h1>ربط التطبيق.</h1>
          <p className="muted">
            الإعدادات الحساسة تبقى على الخادم؛ لا تظهر قيمها هنا.
          </p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="panel settings-panel">
          <h2>01 · مزوّد الإشعارات</h2>
          <span className={`badge ${ready ? "sent" : "draft"}`}>
            {ready ? "تم العثور على إعداد المزوّد" : "بانتظار الإعداد"}
          </span>
          <p>
            يدعم النظام Firebase Cloud Messaging افتراضيًا، وExpo عند اختيار
            PUSH_PROVIDER=expo.
          </p>
          <h3>Firebase / Flutter / تطبيقات أصلية</h3>
          <p>
            فعّل FCM HTTP v1 واضبط ملف حساب الخدمة على الخادم عبر{" "}
            <code>GOOGLE_APPLICATION_CREDENTIALS</code>، أو متغير{" "}
            <code>FCM_SERVICE_ACCOUNT_JSON</code>. لا تضع المفاتيح في التطبيق أو
            المستودع.
          </p>
          <h3>Expo / React Native</h3>
          <p>
            اضبط <code>PUSH_PROVIDER=expo</code> وسجّل Expo Push Tokens. إذا
            فعّلت حماية الوصول في Expo، أضف <code>EXPO_ACCESS_TOKEN</code>.
          </p>
          <p className="notice">
            ظهور الإعداد لا يثبت صلاحية الاتصال. لا يمكن تأكيد الإرسال الفعلي
            قبل ربط حسابك وجهاز اختباري.
          </p>
        </section>
        <section className="panel settings-panel">
          <h2>02 · تسجيل الأجهزة</h2>
          <span className={`badge ${api ? "sent" : "draft"}`}>
            {api ? "مفتاح API مُعدّ" : "بانتظار مفتاح API"}
          </span>
          <p>
            أنشئ مفتاحًا عشوائيًا بطول 32 حرفًا أو أكثر باسم{" "}
            <code>CMS_DEVICE_API_KEY</code>. يستقبل خادم تطبيقك الرمز من
            الموبايل ثم يرسل:
          </p>
          <pre dir="ltr">{`POST /api/devices\nAuthorization: Bearer <server-api-key>\nContent-Type: application/json\n\n{\n  "token": "<device-push-token>",\n  "platform": "android",\n  "segment": "customers"\n}`}</pre>
          <p>
            أعد التسجيل عند تجديد الرمز. استخدم <code>DELETE /api/devices</code>{" "}
            مع الرمز نفسه لإلغاء الاشتراك.
          </p>
          <p className="notice">
            احتفظ بمفتاح API في خادم التطبيق. لا تضمّنه داخل تطبيق الموبايل.
          </p>
        </section>
        <section className="panel settings-panel">
          <h2>03 · الجدولة وفتح الإشعار</h2>
          <p>
            شغّل <code>npm run worker</code> بجانب خادم الويب لتنفّذ الحملات
            المجدولة. يتم التحقق كل 30 ثانية.
          </p>
          <p>
            على الموبايل، اطلب إذن المستخدم للإشعارات، وسجّل الرمز، وعالج{" "}
            <code>data.url</code> لفتح الشاشة المطلوبة. iOS يتطلب إعداد APNs ضمن
            Firebase أو Expo.
          </p>
          <p>
            النتائج الحالية تعني قبول طلب الإرسال لدى المزوّد. تتبّع الفتح
            والوصول وتقارير Expo receipts غير متوفر في هذه النسخة.
          </p>
        </section>
      </div>
    </>
  );
}
