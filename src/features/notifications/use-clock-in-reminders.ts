import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import { useLocale, useMe } from "../session/session";
import { useMySchedule } from "../worker/use-my-schedule";
import { cancelClockInReminders, scheduleClockInReminders } from "./clock-in-reminders";
import { clockInReminderTimes } from "./clock-in-times";
import { useNotificationPermission } from "./permission";
import { useNotificationPrefs } from "./prefs";

/**
 * Keeps a week of "time to clock in?" reminders on the phone: the company's time on its work
 * days, or the person's own schedule when they have one. Re-computed when the app comes to the
 * front, when the settings, the schedule, the language, the permission or the switch change, and
 * when the person clocks in (`doneToday` drops today's).
 */
export function useClockInReminders(doneToday: boolean): void {
  const me = useMe();
  const locale = useLocale();
  const { granted } = useNotificationPermission();
  const { loaded, prefs } = useNotificationPrefs(me.person.notificationPrefs);
  const schedule = useMySchedule();
  const { timezone, workDays, clockInReminder } = me.company.settings;
  const enabled = clockInReminder?.enabled === true;
  const time = clockInReminder?.time ?? "";
  const supported = Platform.OS !== "web";
  // The seven-day window slides: every return to the foreground schedules the days now ahead.
  const [foregrounds, setForegrounds] = useState(0);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") setForegrounds((n) => n + 1);
    });
    return () => sub.remove();
  }, []);

  // Values, not identities: a refetch that returns the same days must not reschedule.
  const days = JSON.stringify(workDays);
  const entries = JSON.stringify((schedule.entries ?? []).map((e) => [e.dayKey, e.startTime ?? "", e.siteName ?? ""]));
  const ready = supported && loaded && schedule.settled;

  useEffect(() => {
    if (!ready) return;
    if (!enabled || !granted || !prefs.clockInReminder) {
      void cancelClockInReminders();
      return;
    }
    const reminders = clockInReminderTimes({
      now: new Date(),
      timezone,
      enabled,
      time,
      workDays: JSON.parse(days) as number[],
      entries: (JSON.parse(entries) as [string, string, string][]).map(([dayKey, startTime, siteName]) => ({
        dayKey,
        startTime: startTime || undefined,
        siteName: siteName || undefined,
      })),
      skipToday: doneToday,
    });
    void scheduleClockInReminders(reminders);
    // `locale`: the scheduled text is fixed at schedule time, so a language change re-schedules.
  }, [ready, enabled, granted, prefs.clockInReminder, timezone, time, days, entries, doneToday, foregrounds, locale]);
}
