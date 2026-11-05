import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { api } from "../../lib/api";
import type { NotificationPrefs } from "../../lib/api-types";

export const NOTIFICATION_PREFS_KEY = "pb.notifications.v1";

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = { clockOutReminder: true, newTask: true, paymentReady: true };

export type NotificationKind = keyof NotificationPrefs;

function parse(raw: string | null): NotificationPrefs | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<NotificationPrefs>;
    return { ...DEFAULT_NOTIFICATION_PREFS, ...v };
  } catch {
    return null;
  }
}

/** The phone's copy; `fallback` (the server's copy from /me) covers a fresh install. */
export async function loadNotificationPrefs(fallback?: NotificationPrefs): Promise<NotificationPrefs> {
  try {
    const saved = parse(await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY));
    if (saved) return saved;
  } catch {
    // storage unavailable: use what the server knows
  }
  return { ...DEFAULT_NOTIFICATION_PREFS, ...fallback };
}

// Module-level store, same shape as the Live Activity preference: profile switches and the
// reminder hook agree without a provider.
type Snapshot = { loaded: boolean; value: NotificationPrefs };
let snapshot: Snapshot = { loaded: false, value: DEFAULT_NOTIFICATION_PREFS };
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: Snapshot) {
  snapshot = next;
  listeners.forEach((l) => l());
}

function ensureLoaded(fallback?: NotificationPrefs) {
  if (snapshot.loaded || loading) return;
  loading = loadNotificationPrefs(fallback).then((value) => {
    loading = null;
    if (!snapshot.loaded) publish({ loaded: true, value });
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => snapshot;

/** Flips one switch everywhere, persists it and mirrors it to the server (best effort). */
export function setNotificationPref(kind: NotificationKind, enabled: boolean) {
  const value = { ...snapshot.value, [kind]: enabled };
  publish({ loaded: true, value });
  void AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(value)).catch(() => undefined);
  void api.me.setNotificationPrefs(value).catch(() => undefined);
}

/** Sign-out: the next person on this phone starts from their own server copy. */
export async function resetNotificationPrefs() {
  snapshot = { loaded: false, value: DEFAULT_NOTIFICATION_PREFS };
  try {
    await AsyncStorage.removeItem(NOTIFICATION_PREFS_KEY);
  } catch {
    // best effort
  }
}

export function useNotificationPrefs(fallback?: NotificationPrefs) {
  const { loaded, value } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    ensureLoaded(fallback);
  }, [fallback]);
  const set = useCallback((kind: NotificationKind, enabled: boolean) => setNotificationPref(kind, enabled), []);
  return { loaded, prefs: value, set };
}
