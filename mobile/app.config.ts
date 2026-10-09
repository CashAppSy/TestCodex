import fs from "node:fs";
import path from "node:path";
import type { ExpoConfig } from "expo/config";
export default (): ExpoConfig => {
  const packageName = process.env.ANDROID_PACKAGE || "com.nabdh.testapp";
  const googleServices =
    process.env.GOOGLE_SERVICES_FILE || "./google-services.json";
  return {
    name: "Cash Mobile",
    slug: "nabdh-test-app",
    version: "0.1.2",
    icon: "./assets/cash-mobile.png",
    orientation: "portrait",
    userInterfaceStyle: "light",
    scheme: "nabdh",
    android: {
      package: packageName,
      versionCode: 3,
      adaptiveIcon: {
        foregroundImage: "./assets/cash-mobile.png",
        backgroundColor: "#000000",
      },
      permissions: ["POST_NOTIFICATIONS"],
      ...(fs.existsSync(path.resolve(process.cwd(), googleServices))
        ? { googleServicesFile: googleServices }
        : {}),
    },
    plugins: [
      "./plugins/with-notification-color.cjs",
      "@react-native-firebase/app",
      "@react-native-firebase/messaging",
      [
        "expo-notifications",
        {
          defaultChannel: "nabdh",
          color: "#d7ae25",
          icon: "./assets/notification-icon.png",
        },
      ],
      "expo-secure-store",
      [
        "expo-build-properties",
        {
          android: {
            usesCleartextTraffic:
              process.env.ALLOW_INSECURE_DEV_HTTP === "true",
          },
        },
      ],
    ],
    web: { bundler: "metro", output: "single", favicon: "./assets/cash-mobile.png" },
    experiments: { baseUrl: process.env.WEB_BASE_PATH || "" },
    extra: { androidPackage: packageName, notificationProvider: "fcm" },
  };
};
