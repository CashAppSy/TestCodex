import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  onNotificationOpenedApp,
  getInitialNotification,
  setBackgroundMessageHandler,
} from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import { Platform, PermissionsAndroid } from "react-native";
import { normalizeNotification, type Incoming } from "./model";
import { saveIncoming } from "./inbox";
import { loadConnection } from "./storage";
import { refreshDevice } from "./api";
export const isWebPreview = false;
const record = async (
  message: Parameters<typeof normalizeNotification>[0],
  state: Incoming["state"],
) => {
  const item = normalizeNotification(message, state);
  await saveIncoming(item);
  return item;
};
export function registerBackgroundHandler() {
  setBackgroundMessageHandler(getMessaging(), async (message) => {
    await record(message, "background");
  });
}
export async function getFcmToken() {
  if (Platform.OS !== "android")
    throw new Error("هذه النسخة مهيأة لاختبار Android أولًا.");
  if (Number(Platform.Version) >= 33) {
    const permission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (permission !== PermissionsAndroid.RESULTS.GRANTED)
      throw new Error("امنح التطبيق إذن الإشعارات من إعدادات Android.");
  }
  return getToken(getMessaging());
}
export async function startNotifications(
  onOpened: (incoming: Incoming) => void,
  onError: (error: string) => void,
) {
  await Notifications.setNotificationChannelAsync("nabdh", {
    name: "إشعارات Cash Mobile",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
  });
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  const messaging = getMessaging();
  const messageListener = onMessage(messaging, async (message) => {
    try {
      const item = await record(message, "foreground");
      await Notifications.scheduleNotificationAsync({
        content: {
          title: item.title,
          body: item.body,
          data: { ...message.data, messageId: item.id, source: "fcm" },
        },
        trigger: { channelId: "nabdh" },
      });
    } catch {
      onError("تعذر حفظ الإشعار أو عرضه.");
    }
  });
  const openListener = onNotificationOpenedApp(messaging, async (message) => {
    try {
      onOpened(await record(message, "opened"));
    } catch {
      onError("تعذر فتح الإشعار.");
    }
  });
  const refreshListener = onTokenRefresh(messaging, async (token) => {
    try {
      const connection = await loadConnection();
      if (connection) await refreshDevice(connection, token);
    } catch {
      onError("تعذر تحديث تسجيل الجهاز. اضغط تحديث التسجيل أو أعد ربط الجهاز.");
    }
  });
  const localListener = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const content = response.notification.request.content;
      void record(
        {
          messageId: String(
            content.data?.messageId || response.notification.request.identifier,
          ),
          notification: {
            title: content.title || "",
            body: content.body || "",
          },
          data: content.data,
        },
        "opened",
      )
        .then(onOpened)
        .catch(() => onError("تعذر فتح الإشعار."));
    },
  );
  const initial = await getInitialNotification(messaging);
  if (initial) onOpened(await record(initial, "opened"));
  const localInitial = await Notifications.getLastNotificationResponseAsync();
  if (localInitial) {
    const content = localInitial.notification.request.content;
    onOpened(
      await record(
        {
          messageId: String(
            content.data?.messageId ||
              localInitial.notification.request.identifier,
          ),
          notification: {
            title: content.title || "",
            body: content.body || "",
          },
          data: content.data,
        },
        "opened",
      ),
    );
    await Notifications.clearLastNotificationResponseAsync();
  }
  return () => {
    messageListener();
    openListener();
    refreshListener();
    localListener.remove();
  };
}
