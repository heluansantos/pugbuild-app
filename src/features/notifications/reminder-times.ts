/** When the company has not set a window, remind after this many hours. */
export const DEFAULT_REMINDER_HOURS = 10;
/** A second nudge for a shift that is clearly forgotten. */
export const LATE_REMINDER_HOURS = 12;

/**
 * Instants at which the phone reminds a worker who is still clocked in: the company's window
 * (or 10 h without one) and again at 12 h. Pure, so it is unit-tested; the schedule itself goes
 * through expo-notifications. Instants already in the past are left out (a shift adopted from
 * the server hours later only gets what is still ahead).
 */
export function clockOutReminderTimes(
  clockInAt: Date,
  companyHours: number | null | undefined,
  now: Date = new Date(),
): Date[] {
  const hours = [companyHours ?? DEFAULT_REMINDER_HOURS, LATE_REMINDER_HOURS];
  const unique = [...new Set(hours.filter((h) => Number.isFinite(h) && h > 0))].sort((a, b) => a - b);
  return unique.map((h) => new Date(clockInAt.getTime() + h * 3_600_000)).filter((at) => at.getTime() > now.getTime());
}
