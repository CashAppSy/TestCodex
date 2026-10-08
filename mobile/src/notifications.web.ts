import type { Incoming } from "./model";
export const isWebPreview = true;
export function registerBackgroundHandler() {}
export async function getFcmToken(): Promise<string> {
  throw new Error("معاينة الويب لا تحصل على رمز FCM. ثبّت نسخة Android.");
}
export async function startNotifications(
  _onOpened: (incoming: Incoming) => void,
  _onError: (message: string) => void,
) {
  return () => {};
}
