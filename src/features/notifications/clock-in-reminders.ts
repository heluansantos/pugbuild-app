import * as Notifications from "expo-notifications";
import { t } from "../../lib/i18n";
import { CLOCK_IN_REMINDER_DAYS, type ClockInReminder } from "./clock-in-times";

/** Fixed identifiers, one per day ahead: scheduling again replaces, cancelling needs no bookkeeping. */
const IDS = Array.from({ length: CLOCK_IN_REMINDER_DAYS }, (_, i) => `pb.clockin.${i}`);

export type ClockInReminderData = { kind: "clock-in-reminder" };

function content(siteName: string | undefined): Notifications.NotificationContentInput {
  const data: ClockInReminderData = { kind: "clock-in-reminder" };
  return {
    title: t("worker.notifications.clockInTitle"),
    body: siteName
      ? t("worker.notifications.clockInBodySite", { site: siteName })
      : t("worker.notifications.clockInBody"),
    data,
    sound: "default",
  };
}

// Serialised like the clock-out reminders: a burst of changes never leaves a stale one behind.
let queue: Promise<void> = Promise.resolve();
function enqueue(job: () => Promise<void>) {
  queue = queue.then(job).catch((e: unknown) => console.warn("clock-in reminder", e));
  return queue;
}

/** Replaces whatever was scheduled with these (seven at most): local, free, works without signal. */
export function scheduleClockInReminders(reminders: readonly ClockInReminder[]) {
  return enqueue(async () => {
    await Promise.all(IDS.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
    await Promise.all(
      reminders.slice(0, IDS.length).map((r, i) =>
        Notifications.scheduleNotificationAsync({
          identifier: IDS[i]!,
          content: content(r.siteName),
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at },
        }),
      ),
    );
  });
}

export function cancelClockInReminders() {
  return enqueue(async () => {
    await Promise.all(IDS.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  });
}
