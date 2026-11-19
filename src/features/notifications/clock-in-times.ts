import { addDaysKey, weekdayOfKey } from "../../lib/schedule";

/** How many days ahead the phone keeps reminders scheduled; refreshed every time the app opens. */
export const CLOCK_IN_REMINDER_DAYS = 7;

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

const formatters = new Map<string, Intl.DateTimeFormat>();
function partsIn(timezone: string, at: Date): Record<string, number> {
  let f = formatters.get(timezone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timezone, f);
  }
  const out: Record<string, number> = {};
  for (const p of f.formatToParts(at)) if (p.type !== "literal") out[p.type] = Number(p.value);
  return out;
}

/** Minutes the zone is ahead of UTC at that instant (negative west of Greenwich). */
function offsetMinutes(timezone: string, at: Date): number {
  const p = partsIn(timezone, at);
  const asUtc = Date.UTC(p.year ?? 1970, (p.month ?? 1) - 1, p.day ?? 1, p.hour ?? 0, p.minute ?? 0, p.second ?? 0);
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/** YYYY-MM-DD of an instant in the company timezone, whatever zone the phone is in. */
export function dayKeyIn(timezone: string, at: Date): string {
  const p = partsIn(timezone, at);
  const pad = (n: number | undefined, len = 2) => String(n ?? 0).padStart(len, "0");
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
}

/**
 * The instant a wall-clock time happens on a day of the company timezone. The phone's own zone
 * plays no part. On the night clocks go forward a time that does not exist (02:30) lands one hour
 * later; on the night they go back, the first of the two is used.
 */
export function zonedInstant(dayKey: string, time: string, timezone: string): Date | null {
  const m = TIME.exec(time);
  const [y, mo, d] = dayKey.split("-").map(Number);
  if (!m || !y || !mo || !d) return null;
  const wall = Date.UTC(y, mo - 1, d, Number(m[1]), Number(m[2]));
  try {
    const off1 = offsetMinutes(timezone, new Date(wall));
    const t1 = wall - off1 * 60_000;
    const off2 = offsetMinutes(timezone, new Date(t1));
    if (off2 === off1) return new Date(t1);
    // The guess sat on the other side of a DST change: try again with the offset found there.
    const t2 = wall - off2 * 60_000;
    if (offsetMinutes(timezone, new Date(t2)) === off2) return new Date(t2);
    // Neither fits: the time is skipped that night.
    return new Date(Math.max(t1, t2));
  } catch {
    // A zone this phone does not know: no reminder is better than one at the wrong hour.
    return null;
  }
}

export interface ClockInReminderInput {
  now: Date;
  /** Company timezone (IANA). */
  timezone: string;
  /** Company setting; nothing is scheduled while it is off. */
  enabled: boolean;
  /** Company reminder time, "HH:mm". */
  time: string;
  /** 0 = Sunday … 6 = Saturday. */
  workDays: readonly number[];
  /** The person's schedule for the coming days (any extra days are ignored). */
  entries: readonly { dayKey: string; startTime?: string; siteName?: string }[];
  /** Already clocked in (or worked) today: today needs no reminder. */
  skipToday?: boolean;
}

export interface ClockInReminder {
  dayKey: string;
  at: Date;
  /** From the schedule entry, for the notification text. */
  siteName?: string;
}

/**
 * When the phone reminds the person to start the shift, for the next seven days. With a schedule
 * for those days, only the days the person is on it, at the entry's own start time when it has
 * one; without any entry, the company's work days at the company time. Never an instant already
 * past. Pure, so it is unit-tested; the scheduling itself goes through expo-notifications.
 */
export function clockInReminderTimes(input: ClockInReminderInput): ClockInReminder[] {
  if (!input.enabled || !TIME.test(input.time)) return [];
  let todayKey: string;
  try {
    todayKey = dayKeyIn(input.timezone, input.now);
  } catch {
    return [];
  }
  const days = Array.from({ length: CLOCK_IN_REMINDER_DAYS }, (_, i) => addDaysKey(todayKey, i));
  const byDay = new Map(input.entries.filter((e) => days.includes(e.dayKey)).map((e) => [e.dayKey, e]));
  const scheduled = byDay.size > 0;
  const out: ClockInReminder[] = [];
  for (const dayKey of days) {
    if (input.skipToday && dayKey === todayKey) continue;
    const entry = byDay.get(dayKey);
    if (scheduled ? !entry : !input.workDays.includes(weekdayOfKey(dayKey))) continue;
    const time = entry?.startTime && TIME.test(entry.startTime) ? entry.startTime : input.time;
    const at = zonedInstant(dayKey, time, input.timezone);
    if (!at || at.getTime() <= input.now.getTime()) continue;
    out.push({ dayKey, at, siteName: entry?.siteName });
  }
  return out;
}
