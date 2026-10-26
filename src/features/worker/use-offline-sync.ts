import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, keys } from "../../lib/api";
import { createOfflineQueue, type QueuedPunch } from "../../lib/offline-queue";
import { t } from "../../lib/i18n";
import { useToast } from "../../components/ui/toast";

export const offlineQueue = createOfflineQueue(AsyncStorage);

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
 * Replays queued punches whenever the phone is back online.
 * Returns the number of punches still waiting and whether the device is online.
 */
export function useOfflineSync() {
  const qc = useQueryClient();
  const toast = useToast();
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);
  const running = useRef(false);

  const refreshCount = useCallback(async () => setPending(await offlineQueue.size()), []);

  const replay = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      const sent = await offlineQueue.replay(send);
      if (sent > 0) {
        toast.ok(t("worker.toasts.synced"));
        await qc.invalidateQueries({ queryKey: keys.openPunch });
        await qc.invalidateQueries({ queryKey: keys.week() });
      }
    } finally {
      running.current = false;
      await refreshCount();
    }
  }, [qc, toast, refreshCount]);

  useEffect(() => {
    // Subscribe first; the initial count arrives asynchronously from storage.
    offlineQueue.size().then(setPending, () => undefined);
    const unsub = NetInfo.addEventListener((s) => {
      const isOnline = !!s.isConnected && s.isInternetReachable !== false;
      setOnline(isOnline);
      if (isOnline) replay();
    });
    return unsub;
  }, [replay, refreshCount]);

  return { pending, online, replay, refreshCount };
}
