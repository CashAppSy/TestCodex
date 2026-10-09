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
      // Use the original transparent bitmap directly, without an adaptive
      // background layer supplied by the app. Launchers may still apply a mask.
      const manifestPath = path.join(
        config.modRequest.platformProjectRoot,
        "app/src/main/AndroidManifest.xml",
      );
      const manifest =
        await AndroidConfig.Manifest.readAndroidManifestAsync(manifestPath);
      const application =
        AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
      application.$["android:icon"] = "@drawable/cash_mobile_logo";
      application.$["android:roundIcon"] = "@drawable/cash_mobile_logo";
      await AndroidConfig.Manifest.writeAndroidManifestAsync(
        manifestPath,
        manifest,
      );
      return config;
    },
  ]);
};
