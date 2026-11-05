import { clockOutReminderTimes, DEFAULT_REMINDER_HOURS, LATE_REMINDER_HOURS } from "../features/notifications/reminder-times";

const start = new Date("2026-10-26T11:00:00Z");
const hoursLater = (h: number) => new Date(start.getTime() + h * 3_600_000);

describe("clockOutReminderTimes", () => {
  it("uses the company window and the 12 h nudge", () => {
    expect(clockOutReminderTimes(start, 8, start)).toEqual([hoursLater(8), hoursLater(12)]);
  });

  it("falls back to 10 h when the company turned the reminder off or never set it", () => {
    expect(DEFAULT_REMINDER_HOURS).toBe(10);
    expect(clockOutReminderTimes(start, null, start)).toEqual([hoursLater(10), hoursLater(LATE_REMINDER_HOURS)]);
    expect(clockOutReminderTimes(start, undefined, start)).toEqual([hoursLater(10), hoursLater(12)]);
  });

  it("collapses a company window of 12 h into one reminder", () => {
    expect(clockOutReminderTimes(start, 12, start)).toEqual([hoursLater(12)]);
  });

  it("keeps a window past 12 h in order", () => {
    expect(clockOutReminderTimes(start, 16, start)).toEqual([hoursLater(12), hoursLater(16)]);
  });

  it("drops instants already behind us when the shift is adopted late", () => {
    expect(clockOutReminderTimes(start, 8, hoursLater(9))).toEqual([hoursLater(12)]);
    expect(clockOutReminderTimes(start, 8, hoursLater(13))).toEqual([]);
  });
});
