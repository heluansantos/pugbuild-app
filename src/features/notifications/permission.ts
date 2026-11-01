import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { IosAuthorizationStatus } from "expo-notifications";
import { useEffect, useSyncExternalStore } from "react";
import { Alert } from "react-native";
import { t } from "../../lib/i18n";

const ASKED_KEY = "pb.notifications.asked";

// Whether iOS lets us notify. Read once per launch; refreshed after every prompt.
type Snapshot = { loaded: boolean; granted: boolean };
let snapshot: Snapshot = { loaded: false, granted: false };
const listeners = new Set<() => void>();

function publish(next: Snapshot) {
  snapshot = next;
  listeners.forEach((l) => l());
}

export async function refreshNotificationPermission(): Promise<boolean> {
  try {
    const p = await Notifications.getPermissionsAsync();
    // Provisional (quiet) delivery still counts: the reminder reaches the Notification Center.
    const granted = p.granted || p.ios?.status === IosAuthorizationStatus.PROVISIONAL;
    publish({ loaded: true, granted });
    return granted;
  } catch {
    publish({ loaded: true, granted: false });
    return false;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
const getSnapshot = () => snapshot;

export function useNotificationPermission() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    if (!snapshot.loaded) void refreshNotificationPermission();
  }, []);
  return s;
}

/**
 * The soft ask happens once, at the first clock-in, never at launch: one sentence on why, then
 * the system prompt. "Not now" is respected: later clock-ins stay quiet. From the Profile card
 * (`fromSettings`) the system prompt comes straight away while iOS still allows it; after a
 * refusal there only Settings can turn notifications on, so the caller opens it.
 */
export async function askNotificationPermission(opts: { fromSettings?: boolean } = {}): Promise<boolean> {
  if (await refreshNotificationPermission()) return true;
  let status: Notifications.NotificationPermissionsStatus | null = null;
  try {
    status = await Notifications.getPermissionsAsync();
  } catch {
    return false;
  }
  if (status.ios?.status === IosAuthorizationStatus.DENIED || !status.canAskAgain) return false;
  if (!opts.fromSettings) {
    let asked = false;
    try {
      asked = (await AsyncStorage.getItem(ASKED_KEY)) === "1";
    } catch {
      // storage unavailable: ask
    }
    if (asked) return false;
    try {
      await AsyncStorage.setItem(ASKED_KEY, "1");
    } catch {
      // best effort
    }
    const wants = await new Promise<boolean>((resolve) =>
      Alert.alert(t("worker.notifications.permissionTitle"), t("worker.notifications.permissionBody"), [
        { text: t("worker.notifications.permissionLater"), style: "cancel", onPress: () => resolve(false) },
        { text: t("worker.notifications.permissionAllow"), onPress: () => resolve(true) },
      ]),
    );
    if (!wants) return false;
  }
  try {
    const p = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
    publish({ loaded: true, granted: p.granted });
    return p.granted;
  } catch {
    return false;
  }
}
