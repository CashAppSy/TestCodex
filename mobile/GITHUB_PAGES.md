# معاينة مجانية على GitHub Pages

المعاينة تنشر واجهة تطبيق الاختبار من `mobile/` فقط. الإشعارات فيها محاكاة محلية محفوظة في المتصفح؛ لا تُنشر لوحة الإدارة أو قاعدة بياناتها، ولا يُرسل Firebase إشعارات من هذه الصفحة.

من المستودع `CashAppSy/TestCodex` افتح **Settings → Pages → Build and deployment → Source** واختر **GitHub Actions**. يحتاج تفعيل Pages صلاحية إدارة المستودع، وأن يكون GitHub Pages متاحًا حسب رؤية المستودع وخطة حسابك؛ في الخطة المجانية استخدم مستودعًا عامًا.

بعد رفع الكود إلى `main`، يعمل workflow **Publish app preview to GitHub Pages** تلقائيًا. إن كان قد فشل قبل تفعيل Pages، افتح **Actions** وشغّله عبر **Run workflow** أو أعد تشغيل المحاولة. رابط الموقع يظهر في نتيجة خطوة النشر وفي إعدادات Pages، والعنوان المتوقع لهذا المستودع هو `https://cashappsy.github.io/TestCodex/`. لا تعتبر الرابط منشورًا حتى تنجح خطوة النشر ويُفتح الموقع.

لا يحتاج workflow إلى Firebase secrets أو ملف حساب خدمة، ولا ترفعهما إلى GitHub Pages. يحدد البناء `WEB_BASE_PATH=/TestCodex` كي تعمل ملفات JavaScript تحت مسار المستودع بدلًا من طلبها من جذر الدومين. المحلي يبقى بمسار الجذر عندما لا تُحدد هذه القيمة.

لإعادة بناء نسخة Pages محليًا:

```sh
cd mobile
npm ci
WEB_BASE_PATH=/TestCodex EXPO_OFFLINE=1 CI=1 npm run export:web
```

هذه النسخة تستخدم مسار `/TestCodex/`، لذا خدمها بهذا المسار عند اختبارها. لن تستقبل FCM في المتصفح؛ استقبال الإشعارات الحقيقية يحتاج نسخة Android، وخادم لوحة متاحًا عبر HTTPS.
