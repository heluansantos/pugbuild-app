import type { LunchRule } from "./api-types";

export interface WorkedResult {
  /** Minutes paid after lunch deduction. */
  workedMinutes: number;
  /** Minutes removed for lunch (0 when paid or shift too short). */
  lunchDeductedMinutes: number;
  /** Raw span between clock-in and clock-out. */
  spanMinutes: number;
}

/** Minutes between two instants, never negative, rounded to the minute. */
export function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

/**
 * Same rule as the server: lunch is deducted automatically when unpaid and the shift reaches the
 * minimum length. The phone only previews it; the server's number wins at clock-out.
 */
export function computeWorked(clockIn: Date, clockOut: Date, lunch: LunchRule): WorkedResult {
  const spanMinutes = minutesBetween(clockIn, clockOut);
  const deduct = !lunch.paid && lunch.minutes > 0 && spanMinutes >= lunch.minShiftMinutes;
  const lunchDeductedMinutes = deduct ? Math.min(lunch.minutes, spanMinutes) : 0;
  return { spanMinutes, lunchDeductedMinutes, workedMinutes: spanMinutes - lunchDeductedMinutes };
}

/** Live counter for an open shift. */
export function computeElapsed(clockIn: Date, now: Date, lunch: LunchRule): WorkedResult {
  return computeWorked(clockIn, now, lunch);
}

export const MAX_REASONABLE_SHIFT_MINUTES = 16 * 60;
