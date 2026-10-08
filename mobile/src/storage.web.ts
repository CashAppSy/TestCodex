import type { Connection } from "./storage.native";
export type { Connection } from "./storage.native";
export async function loadConnection(): Promise<Connection | null> {
  return null;
}
export async function saveConnection(_value: Connection) {
  throw new Error("الربط الفعلي متاح في نسخة Android فقط.");
}
export async function clearConnection() {}
