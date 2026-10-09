# Cash Mobile Android test app — 0.1.9

Install cash-mobile-arm64.apk as an update for Android 7.0+ ARM64 devices with Google Play Services. Package com.nabdh.testapp, versionCode 10, same development signing certificate as 0.1.8, no Metro required.

New: phone-number/password sign-in and registration with a name. Use an international number (+country-code or 00country-code), a password of 8–128 characters and confirm it for registration. The account and its subscriber entry are created automatically in the dashboard; FCM device registration links the phone to its account. Additional devices signed in to the same account receive that account’s selected campaigns. No admin pairing code is needed for the normal account flow.

The Account tab shows name/phone and notification registration refresh/sign-out. Sign-out revokes this device only and clears its local inbox. A different account on that physical device gets a new device ID to isolate server event history. Passwords are salted PBKDF2 hashes on the server and are never saved in the app. The app stores only its scoped device credential and basic account metadata in SecureStore. No SMS verification or password recovery is implemented; number ownership is not verified. Existing reserved subscriber numbers cannot be claimed through public registration.

Cloudflare main d519eee or newer must be deployed with npm run db:remote && npm run deploy from cloudflare to apply migration 0004_mobile_accounts.sql. Dashboard: https://testcodex.eng-ali-m-ibrahim.workers.dev

Notification type tests, navy/gold dashboard, selected subscriber campaign audiences and resend are retained. These are test events, not real payment or subscriber-system integration. Original transparent logo pixels and transparent adaptive icon background are retained. Android small notification icons remain monochrome. Firebase service-account private keys are not included.

Verified: 13 worker/D1/mock-FCM/browser tests, 10 mobile unit tests, a mobile browser preview test, type checks, Worker dry-run, native release build, matching signature, manifest version/icons, actual embedded current source and key exclusion. No physical Android runtime test was performed here.

The binary-only android-test-builds branch must not be merged into main. Artifact SHA256 is in cash-mobile-arm64.apk.sha256.
