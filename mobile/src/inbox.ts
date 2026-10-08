import AsyncStorage from "@react-native-async-storage/async-storage";
import { mergeInbox, type Incoming } from "./model";
const KEY = "nabdh_inbox_v1";
let pending: Promise<unknown> = Promise.resolve();
const listeners = new Set<() => void>();
export async function loadInbox(): Promise<Incoming[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data.slice(0, 100) : [];
  } catch {
    return [];
  }
}
export function saveIncoming(incoming: Incoming): Promise<void> {
  const task = pending
    .catch(() => {})
    .then(async () => {
      const inbox = await loadInbox();
      await AsyncStorage.setItem(
        KEY,
        JSON.stringify(mergeInbox(inbox, incoming)),
      );
      listeners.forEach((listener) => listener());
    });
  pending = task;
  return task;
}
export function clearInbox(): Promise<void> {
  const task = pending
    .catch(() => {})
    .then(async () => {
      await AsyncStorage.removeItem(KEY);
      listeners.forEach((listener) => listener());
    });
  pending = task;
  return task;
}
export function subscribeInbox(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
