# Cash Mobile 0.1.6 — Android test APK

Download `cash-mobile-arm64.apk`. Requires Android 7+ (API 24), ARM64 and Google Play services for Firebase notifications. Package: `com.nabdh.testapp`; version code: 7.

This version provides a native adaptive launcher icon with an explicit transparent background on Android 8+, instead of the legacy bitmap icon used by 0.1.5. The original transparent logo is retained unchanged; foreground padding protects it from clipping. Android 7 uses the original transparent PNG fallback. Both the regular and round launcher icon point at these resources.

Notification behavior is unchanged from 0.1.5: original logo, monochrome small icon and gray accent. Android and device launchers may still apply their own visual styling. The final appearance has not been verified on a physical phone.

This standalone release uses the same development signing certificate as the previous test APK. Install it as an update, then remove and add the home-screen shortcut if the launcher caches the previous icon. No Metro server is required.

Backend: https://testcodex.eng-ali-m-ibrahim.workers.dev

The companion `.sha256` file provides the checksum. No Firebase service-account private key is included. This binary-only branch is not intended to be merged into main.
