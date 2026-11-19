import type { ScheduleEntryDto } from "./api-types";

/** Day keys are calendar days (YYYY-MM-DD in the company timezone): plain date arithmetic, no zone. */
const DAY_MS = 86_400_000;
const keyToUtc = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};

export function addDaysKey(key: string, days: number): string {
  return new Date(keyToUtc(key) + days * DAY_MS).toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOfKey(key: string): number {
  return new Date(keyToUtc(key)).getUTCDay();
}

/** The "Next days" card: from today on, soonest first, a handful at most. */
export function upcomingEntries<T extends Pick<ScheduleEntryDto, "dayKey">>(
  entries: readonly T[],
  todayKey: string,
  limit = 3,
): T[] {
  return entries
    .filter((e) => e.dayKey >= todayKey)
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey))
    .slice(0, limit);
}

export type RelativeDay = "today" | "tomorrow" | null;

export function relativeDay(dayKey: string, todayKey: string): RelativeDay {
  if (dayKey === todayKey) return "today";
  if (dayKey === addDaysKey(todayKey, 1)) return "tomorrow";
  return null;
}
