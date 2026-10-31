import type { LunchRule } from "./api-types";

export interface WorkedResult {
  /** Gross minutes worked: clock-in to clock-out, what the person writes down. */
  workedMinutes: number;
  /** Minutes the pay rule removes for lunch (0 when paid or shift too short). Money only. */
  lunchDeductedMinutes: number;
  /** Minutes the pay corresponds to: worked minus lunch. */
  paidMinutes: number;
  /** Raw span between clock-in and clock-out (same as workedMinutes). */
  spanMinutes: number;
}

/** Minutes between two instants, never negative, rounded to the minute. */
export function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

/**
 * Hours are gross; same lunch rule as the server, applied to pay only: lunch is deducted
 * automatically when unpaid and the shift reaches the minimum length. The phone only previews it;
 * the server's number wins at clock-out.
 */
export function computeWorked(clockIn: Date, clockOut: Date, lunch: LunchRule): WorkedResult {
  const spanMinutes = minutesBetween(clockIn, clockOut);
  const deduct = !lunch.paid && lunch.minutes > 0 && spanMinutes >= lunch.minShiftMinutes;
  const lunchDeductedMinutes = deduct ? Math.min(lunch.minutes, spanMinutes) : 0;
  return { spanMinutes, lunchDeductedMinutes, workedMinutes: spanMinutes, paidMinutes: spanMinutes - lunchDeductedMinutes };
}

/** Live counter for an open shift. */
export function computeElapsed(clockIn: Date, now: Date, lunch: LunchRule): WorkedResult {
  return computeWorked(clockIn, now, lunch);
}

export const MAX_REASONABLE_SHIFT_MINUTES = 16 * 60;
