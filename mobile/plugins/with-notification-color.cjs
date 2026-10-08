const { AndroidConfig, withAndroidManifest } = require("expo/config-plugins");

// Expo and RNFirebase both declare this resource. Keep the app's color when
// Android merges the library manifests, including after a fresh prebuild.
module.exports = function withNotificationColor(config) {
  return withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults,
    );
    const color = application["meta-data"]?.find(
      (entry) =>
        entry.$["android:name"] ===
        "com.google.firebase.messaging.default_notification_color",
    );
    if (color) color.$["tools:replace"] = "android:resource";
    return config;
  });
};
