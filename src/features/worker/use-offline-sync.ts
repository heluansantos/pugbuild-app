import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { api, keys } from "../../lib/api";
import { createOfflineQueue, type QueuedPunch } from "../../lib/offline-queue";
import { t } from "../../lib/i18n";
import { useToast } from "../../components/ui/toast";
import { useSession } from "../session/session";

export const offlineQueue = createOfflineQueue(AsyncStorage);

const RETRY_MS = 30_000;

async function send(item: QueuedPunch) {
  const payload = {
    location: item.location,
    deviceAt: item.deviceAt,
    comment: item.comment,
    notifyOffice: item.notifyOffice,
    clientId: item.clientId,
  };
  if (item.kind === "clock-in") await api.punches.clockIn(payload);
  else await api.punches.clockOut(payload);
}

/**
 * Replays this person's queued punches when the phone is back online, when the app returns to
 * the foreground and every 30 s while something is waiting (a "connected" Wi-Fi without internet
 * never fires a network change). Exposes the queue so screens can show a pending shift right away.
 */
export function useOfflineSync() {
  const qc = useQueryClient();
  const toast = useToast();
  const ownerId = useSession().me?.member.id;
  const [items, setItems] = useState<QueuedPunch[]>([]);
  const [online, setOnline] = useState(true);
  const running = useRef(false);

  const reload = useCallback(
    () => offlineQueue.list().then((all) => setItems(all.filter((i) => !ownerId || !i.ownerId || i.ownerId === ownerId))),
    [ownerId],
  );

  const replay = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      const { sent, dropped } = await offlineQueue.replay(send, ownerId);
      if (sent > 0) toast.ok(t("worker.toasts.synced"));
      if (dropped > 0) toast.error(t("worker.toasts.syncRejected"));
      if (sent > 0 || dropped > 0) {
        await qc.invalidateQueries({ queryKey: keys.openPunch });
        await qc.invalidateQueries({ queryKey: ["week"] });
      }
    } finally {
      running.current = false;
    }
  }, [qc, toast, ownerId]);

  useEffect(() => {
    // Storage is async: the first list arrives through the same subscription path as every change.
    const off = offlineQueue.subscribe(() => void reload());
    queueMicrotask(() => void reload());
    const unsubNet = NetInfo.addEventListener((s) => {
      const isOnline = !!s.isConnected && s.isInternetReachable !== false;
      setOnline(isOnline);
      if (isOnline) void replay();
    });
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") void replay();
    });
    return () => {
      off();
      unsubNet();
      appState.remove();
    };
  }, [reload, replay]);

  useEffect(() => {
    if (items.length === 0) return;
    const id = setInterval(() => void replay(), RETRY_MS);
    return () => clearInterval(id);
  }, [items.length, replay]);

  return { items, pending: items.length, online, replay };
}
