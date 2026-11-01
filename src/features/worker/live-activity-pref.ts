import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useSyncExternalStore } from "react";

export const LIVE_ACTIVITY_KEY = "pb.liveActivity";

/** On by default: iOS asks the person to allow Live Activities the first time one starts. */
export type LiveActivityPref = boolean;

export async function loadLiveActivityPref(): Promise<LiveActivityPref> {
  try {
    const saved = await AsyncStorage.getItem(LIVE_ACTIVITY_KEY);
    if (saved === "on") return true;
    if (saved === "off") return false;
  } catch {
    // storage unavailable: keep the default
  }
  return true;
}

export async function saveLiveActivityPref(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(LIVE_ACTIVITY_KEY, value ? "on" : "off");
  } catch {
    // best effort: the in-memory value below still applies for this session
  }
}

// Module-level store so the profile toggle and the activity hook agree without a provider.
type Snapshot = { loaded: boolean; value: LiveActivityPref };
let snapshot: Snapshot = { loaded: false, value: true };
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: Snapshot) {
  snapshot = next;
  listeners.forEach((l) => l());
}

function ensureLoaded() {
  if (snapshot.loaded || loading) return;
  loading = loadLiveActivityPref().then((value) => {
    loading = null;
    // A choice made while the read was in flight wins over the stored value.
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

/** Sets the preference everywhere at once and persists it. */
export function setLiveActivityPref(value: boolean) {
  publish({ loaded: true, value });
  void saveLiveActivityPref(value);
}

/** `enabled` is false only when the worker turned the Lock Screen timer off; it stays false until storage is read. */
export function useLiveActivityPref() {
  const { loaded, value } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    ensureLoaded();
  }, []);
  const set = useCallback((next: boolean) => setLiveActivityPref(next), []);
  return { loaded, enabled: loaded && value, set };
}
