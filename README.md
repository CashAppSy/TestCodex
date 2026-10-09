# Cash Mobile Android test app — 0.1.8

Download `cash-mobile-arm64.apk` for Android 7.0+ ARM64 devices with Google Play Services. Package `com.nabdh.testapp`, versionCode 9, same development signing certificate as 0.1.7; install as an update. No Metro or paid build service required.

This version adds an automatic notification test catalog to the Arabic “التجارب” tab. Configure enabled types and title/body templates from the Cloudflare admin dashboard. The app tests immediate or delayed events for its own paired device only; it does not process real payments or balance changes. Existing uncertain requests retain their ID to prevent duplicates.

Deploy main commit db5bdd4 or newer with `npm run db:remote && npm run deploy` from `cloudflare` before using the new features. This applies migration 0003. Dashboard: https://testcodex.eng-ali-m-ibrahim.workers.dev

The dashboard now provides a navy/gold Arabic layout, campaign table, charts from real records, subscriber number/name management, admin device-to-subscriber assignment, and campaigns for selected subscribers. Platform and segment remain additional audience filters. Resending preserves the selected subscribers. This test flow does not integrate the production subscriber identity system.

The original transparent user-supplied logo is preserved. Adaptive icon background is Android transparent; notification small icons remain monochrome as required by Android. The Firebase service-account private key is not included in this app.

Verified: worker/D1/FCM mock and browser tests, mobile unit tests and type checks, native release build, matching signature, original logo pixels and transparent icon resources. Physical Android reception needs device testing; no emulator or physical device was connected for this build.

This branch contains binaries only; do not merge it into main. Check `cash-mobile-arm64.apk.sha256` for the artifact checksum.
