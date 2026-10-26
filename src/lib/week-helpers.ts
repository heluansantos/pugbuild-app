import { dayParts } from "./format";

export type WeekDayState = "worked" | "rest" | "off" | "today" | "future";

export interface WeekStripDay {
  key: string;
  label: string;
  day: number;
  state: WeekDayState;
}

export interface PunchLike {
  dayKey: string;
  status: "open" | "closed";
  workedMinutes?: number;
}

/** Minutes per day key for a list of punches (open ones use `liveMinutes` when given). */
export function minutesByDay(punches: readonly PunchLike[], liveMinutes = 0): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of punches) {
    const m = p.status === "closed" ? (p.workedMinutes ?? 0) : liveMinutes;
    out[p.dayKey] = (out[p.dayKey] ?? 0) + m;
  }
  return out;
}

/** Builds the 7 pills of the pay week. `workedKeys` are the days with at least one punch. */
export function buildWeekStrip(
  dayKeys: readonly string[],
  workedKeys: ReadonlySet<string>,
  todayKey: string,
  workDays: readonly number[],
  locale: string,
): WeekStripDay[] {
  return dayKeys.map((key) => {
    const { label, day, weekday } = dayParts(key, locale);
    let state: WeekDayState;
    if (key === todayKey) state = "today";
    else if (key > todayKey) state = "future";
    else if (workedKeys.has(key)) state = "worked";
    else state = "off";
    if (state === "future" && !workDays.includes(weekday)) state = "off";
    return { key, label, day, state };
  });
}

export interface DayBar {
  key: string;
  label: string;
  minutes: number;
  isToday: boolean;
  /** 0–1 relative to the busiest day of the week (at least one hour). */
  ratio: number;
}

export function buildDayBars(
  dayKeys: readonly string[],
  byDay: Record<string, number>,
  todayKey: string,
  locale: string,
): DayBar[] {
  const max = Math.max(60, ...dayKeys.map((k) => byDay[k] ?? 0));
  return dayKeys.map((key) => {
    const minutes = byDay[key] ?? 0;
    return { key, label: dayParts(key, locale).label, minutes, isToday: key === todayKey, ratio: minutes / max };
  });
}
