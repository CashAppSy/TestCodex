# Cash Mobile 0.1.7 — Payment notification test APK

`cash-mobile-arm64.apk`: standalone Android 7+ ARM64 app; Google Play services required for Firebase push. Package `com.nabdh.testapp`, version code 8. Same development signing certificate as 0.1.6; install as an update. No Metro needed.

New Bills tab tests a simulated payment and a private notification to the initiating device. Choose immediate notification, or delayed notification to allow moving the app to the background. Delayed notifications become due after 15 seconds and are picked up on the next minute cron tick; timing is not guaranteed. Tapping the notification loads the payment from the authenticated server and opens its details. No real money is charged.

The repeat-same-operation button tests idempotency. Interrupted submission attempts retain their request ID locally. The backend isolates payment records by device, validates amounts, rate limits submissions, and atomically claims the notification once. Unknown outcomes are not automatically resent.

Backend deployment prerequisite: main branch, cloudflare root, deploy command `npm run db:remote && npm run deploy`; applies migration `0002_payment_demo.sql`. Demo requires `ENABLE_PAYMENT_DEMO=true` (included in configuration) and existing Firebase service-account secret. Pairing is limited to the test segment. Production invoice integration and subscriber identity are not implemented by this demo.

Backend: https://testcodex.eng-ali-m-ibrahim.workers.dev

Original transparent logo, adaptive transparent background and notification settings retained. No physical-device push delivery or live Cloudflare deployment was verified in the build environment. Firebase sends were mocked in integration tests. No service-account private key is bundled. See companion SHA256 checksum. Binary-only branch, do not merge into main.
