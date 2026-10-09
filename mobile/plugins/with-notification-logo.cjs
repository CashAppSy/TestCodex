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
      // Add layout padding without changing any pixels in the original logo.
      await fs.mkdir(path.join(res, "drawable"), { recursive: true });
      await fs.writeFile(
        path.join(res, "drawable/cash_mobile_launcher.xml"),
        '<inset xmlns:android="http://schemas.android.com/apk/res/android" android:drawable="@drawable/cash_mobile_logo" android:inset="18%" />',
      );
      const adaptive = path.join(res, "mipmap-anydpi-v26");
      await fs.mkdir(adaptive, { recursive: true });
      const xml =
        '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/iconBackground"/><foreground android:drawable="@drawable/cash_mobile_launcher"/></adaptive-icon>';
      for (const name of ["ic_launcher.xml", "ic_launcher_round.xml"])
        await fs.writeFile(path.join(adaptive, name), xml);
      return config;
    },
  ]);
};
