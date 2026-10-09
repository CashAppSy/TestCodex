const fs = require("node:fs/promises");
const path = require("node:path");
const {
  AndroidConfig,
  withAndroidManifest,
  withFinalizedMod,
} = require("expo/config-plugins");

module.exports = function withNotificationLogo(config) {
  config = withAndroidManifest(config, (config) => {
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults),
      "expo.modules.notifications.large_notification_icon",
      "@drawable/cash_mobile_logo",
      "resource",
    );
    return config;
  });
  return withFinalizedMod(config, [
    "android",
    async (config) => {
      const res = path.join(
        config.modRequest.platformProjectRoot,
        "app/src/main/res",
      );
      const drawable = path.join(res, "drawable-nodpi");
      await fs.mkdir(drawable, { recursive: true });
      await fs.copyFile(
        path.join(config.modRequest.projectRoot, "assets/cash-mobile.png"),
        path.join(drawable, "cash_mobile_logo.png"),
      );
      // Provide a native adaptive icon instead of letting modern launchers
      // convert a legacy bitmap into an icon with an opaque background plate.
      // Keep a transparent original bitmap as the pre-Android-8 fallback.
      const legacy = path.join(res, "mipmap-nodpi");
      const adaptive = path.join(res, "mipmap-anydpi-v26");
      const foreground = path.join(res, "drawable");
      await Promise.all([
        fs.mkdir(legacy, { recursive: true }),
        fs.mkdir(adaptive, { recursive: true }),
        fs.mkdir(foreground, { recursive: true }),
      ]);
      await fs.copyFile(
        path.join(config.modRequest.projectRoot, "assets/cash-mobile.png"),
        path.join(legacy, "cash_mobile_launcher.png"),
      );
      // The adaptive canvas is 108dp; keep the logo within its central 72dp.
      await fs.writeFile(
        path.join(foreground, "cash_mobile_launcher_foreground.xml"),
        '<?xml version="1.0" encoding="utf-8"?>\n' +
          '<inset xmlns:android="http://schemas.android.com/apk/res/android" android:drawable="@drawable/cash_mobile_logo" android:inset="16.67%" />\n',
      );
      await fs.writeFile(
        path.join(adaptive, "cash_mobile_launcher.xml"),
        '<?xml version="1.0" encoding="utf-8"?>\n' +
          '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n' +
          '  <background android:drawable="@android:color/transparent" />\n' +
          '  <foreground android:drawable="@drawable/cash_mobile_launcher_foreground" />\n' +
          '</adaptive-icon>\n',
      );
      const manifestPath = path.join(
        config.modRequest.platformProjectRoot,
        "app/src/main/AndroidManifest.xml",
      );
      const manifest =
        await AndroidConfig.Manifest.readAndroidManifestAsync(manifestPath);
      const application =
        AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
      application.$["android:icon"] = "@mipmap/cash_mobile_launcher";
      application.$["android:roundIcon"] = "@mipmap/cash_mobile_launcher";
      await AndroidConfig.Manifest.writeAndroidManifestAsync(
        manifestPath,
        manifest,
      );
      return config;
    },
  ]);
};
