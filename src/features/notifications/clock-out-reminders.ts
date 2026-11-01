import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";
import type { PunchDto } from "../../lib/api-types";
import { t } from "../../lib/i18n";
import { useLocale, useMe } from "../session/session";
import { useNotificationPermission } from "./permission";
import { useNotificationPrefs } from "./prefs";
import { clockOutReminderTimes } from "./reminder-times";

/** Fixed identifiers: scheduling again replaces, cancelling needs no bookkeeping. */
const IDS = ["pb.clockout.0", "pb.clockout.1"] as const;
const TEST_ID = "pb.clockout.test";

export type ReminderData = { kind: "clock-out-reminder" };

function content(): Notifications.NotificationContentInput {
  const data: ReminderData = { kind: "clock-out-reminder" };
  return { title: t("worker.notifications.reminderTitle"), body: t("worker.notifications.reminderBody"), data, sound: "default" };
}

/**
 * Scheduled on the phone at clock-in: free, works without signal, and fires even when the
 * app is closed. Cancelled at clock-out. Calls are serialised so a fast in/out never leaves a
 * stale reminder behind.
 */
let queue: Promise<void> = Promise.resolve();
function enqueue(job: () => Promise<void>) {
  queue = queue.then(job).catch((e: unknown) => console.warn("clock-out reminder", e));
  return queue;
}

export function scheduleClockOutReminders(clockInAt: Date, companyHours: number | null | undefined) {
  return enqueue(async () => {
    await Promise.all(IDS.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
    const times = clockOutReminderTimes(clockInAt, companyHours);
    await Promise.all(
      times.slice(0, IDS.length).map((date, i) =>
        Notifications.scheduleNotificationAsync({
          identifier: IDS[i]!,
          content: content(),
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
        }),
      ),
    );
  });
}

export function cancelClockOutReminders() {
  return enqueue(async () => {
    await Promise.all([...IDS, TEST_ID].map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  });
}

/** Dev only: proves the pipeline end to end without waiting ten hours. */
export function scheduleTestReminder(seconds: number) {
  return enqueue(async () => {
    await Notifications.scheduleNotificationAsync({
      identifier: TEST_ID,
      content: content(),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false },
    });
  });
}

/**
 * Follows the open shift: schedules when one appears (server or queued offline), cancels when
 * it ends, re-schedules when the language, the company window or the permission changes.
 */
export function useClockOutReminders(punch: PunchDto | null): void {
  const me = useMe();
  const locale = useLocale();
  const { granted } = useNotificationPermission();
  const { loaded, prefs } = useNotificationPrefs(me.person.notificationPrefs);
  const hours = me.company.settings.forgottenClockOutReminderHours;
  const clockInAt = punch?.status === "open" ? punch.clockIn.at : null;
  const supported = Platform.OS !== "web";

  useEffect(() => {
    if (!supported || !loaded) return;
    if (clockInAt === null || !granted || !prefs.clockOutReminder) {
      void cancelClockOutReminders();
      return;
    }
    void scheduleClockOutReminders(new Date(clockInAt), hours);
    // `locale`: the scheduled text is fixed at schedule time, so a language change re-schedules.
  }, [supported, loaded, clockInAt, granted, prefs.clockOutReminder, hours, locale]);
}
