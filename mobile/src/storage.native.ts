import * as SecureStore from "expo-secure-store";
export type MobileAccount = { id: number; name: string; phone: string };
export type Connection = {
  url: string;
  credential: string;
  deviceId: number;
  account?: MobileAccount;
};
const KEY = "nabdh_connection_v1";
export async function loadConnection(): Promise<Connection | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  return raw ? JSON.parse(raw) : null;
}
export async function saveConnection(value: Connection) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(value));
}
export async function clearConnection() {
  await SecureStore.deleteItemAsync(KEY);
}
