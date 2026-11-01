import * as Notifications from "expo-notifications";
import { useRouter, type Href } from "expo-router";
import { useEffect } from "react";

// Banners show while the app is in front too: a reminder with the app open is still a reminder.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** Server pushes carry `data.screen`; local reminders carry `data.kind`. Both land on a tab. */
export function screenFor(data: Record<string, unknown> | undefined): Href {
  const screen = data?.screen ?? (data?.kind === "clock-out-reminder" ? "clock" : undefined);
  if (screen === "tasks") return "/(tabs)/tasks" as Href;
  if (screen === "payments") return "/(tabs)/week" as Href;
  return "/(tabs)" as Href;
}

/** A tap on a notification (app closed, in the background or in front) opens the matching tab. */
export function useNotificationTaps(enabled: boolean): void {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      router.navigate(screenFor(response.notification.request.content.data as Record<string, unknown> | undefined));
    };
    // Cold start from a tap: the response is waiting before any listener exists.
    void Notifications.getLastNotificationResponseAsync().then((r) => {
      open(r);
      if (r) void Notifications.clearLastNotificationResponseAsync();
    });
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [enabled, router]);
}
