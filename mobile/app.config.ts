import fs from "node:fs";
import path from "node:path";
import type { ExpoConfig } from "expo/config";
export default (): ExpoConfig => {
  const packageName = process.env.ANDROID_PACKAGE || "com.nabdh.testapp";
  const googleServices =
    process.env.GOOGLE_SERVICES_FILE || "./google-services.json";
  return {
    name: "نبض · تطبيق الاختبار",
    slug: "nabdh-test-app",
    version: "0.1.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    scheme: "nabdh",
    android: {
      package: packageName,
      permissions: ["POST_NOTIFICATIONS"],
      ...(fs.existsSync(path.resolve(process.cwd(), googleServices))
        ? { googleServicesFile: googleServices }
        : {}),
    },
    plugins: [
      "@react-native-firebase/app",
      "@react-native-firebase/messaging",
      ["expo-notifications", { defaultChannel: "nabdh", color: "#365e42" }],
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
    web: { bundler: "metro", output: "single" },
    experiments: { baseUrl: process.env.WEB_BASE_PATH || "" },
    extra: { androidPackage: packageName, notificationProvider: "fcm" },
  };
};
