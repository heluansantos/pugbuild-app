import {
  clockInReminderTimes,
  dayKeyIn,
  zonedInstant,
  type ClockInReminderInput,
} from "../features/notifications/clock-in-times";
import { addDaysKey, relativeDay, upcomingEntries, weekdayOfKey } from "../lib/schedule";

const NY = "America/New_York";
const MON_TO_SAT = [1, 2, 3, 4, 5, 6];

// Wednesday 2026-11-18, 05:00 in New York (EST, UTC-5).
const now = new Date("2026-11-18T10:00:00Z");
const base: ClockInReminderInput = {
  now,
  timezone: NY,
  enabled: true,
  time: "07:00",
  workDays: MON_TO_SAT,
  entries: [],
};
const iso = (list: { at: Date }[]) => list.map((r) => r.at.toISOString());

describe("zonedInstant", () => {
  it("reads the wall clock in the company timezone, not the phone's", () => {
    expect(zonedInstant("2026-11-18", "07:00", NY)?.toISOString()).toBe("2026-11-18T12:00:00.000Z");
    expect(zonedInstant("2026-07-15", "07:00", NY)?.toISOString()).toBe("2026-07-15T11:00:00.000Z");
    expect(zonedInstant("2026-11-18", "07:00", "America/Los_Angeles")?.toISOString()).toBe("2026-11-18T15:00:00.000Z");
    expect(zonedInstant("2026-11-18", "07:00", "America/Sao_Paulo")?.toISOString()).toBe("2026-11-18T10:00:00.000Z");
    expect(zonedInstant("2026-11-18", "07:00", "Asia/Tokyo")?.toISOString()).toBe("2026-11-17T22:00:00.000Z");
    expect(zonedInstant("2026-11-18", "00:00", "UTC")?.toISOString()).toBe("2026-11-18T00:00:00.000Z");
  });

  it("the day clocks go back (2026-11-01): the morning is already on winter time", () => {
    expect(zonedInstant("2026-10-31", "07:00", NY)?.toISOString()).toBe("2026-10-31T11:00:00.000Z");
    expect(zonedInstant("2026-11-01", "07:00", NY)?.toISOString()).toBe("2026-11-01T12:00:00.000Z");
    // 01:30 happens twice that night: the first one.
    expect(zonedInstant("2026-11-01", "01:30", NY)?.toISOString()).toBe("2026-11-01T05:30:00.000Z");
  });

  it("the day clocks go forward (2027-03-14): the morning is already on summer time", () => {
    expect(zonedInstant("2027-03-13", "07:00", NY)?.toISOString()).toBe("2027-03-13T12:00:00.000Z");
    expect(zonedInstant("2027-03-14", "07:00", NY)?.toISOString()).toBe("2027-03-14T11:00:00.000Z");
    expect(zonedInstant("2027-03-14", "03:00", NY)?.toISOString()).toBe("2027-03-14T07:00:00.000Z");
    // 02:30 does not exist that night: one hour later.
    expect(zonedInstant("2027-03-14", "02:30", NY)?.toISOString()).toBe("2027-03-14T07:30:00.000Z");
  });

  it("refuses what it cannot read", () => {
    expect(zonedInstant("2026-11-18", "7am", NY)).toBeNull();
    expect(zonedInstant("2026-11-18", "24:00", NY)).toBeNull();
    expect(zonedInstant("soon", "07:00", NY)).toBeNull();
    expect(zonedInstant("2026-11-18", "07:00", "Mars/Olympus")).toBeNull();
  });

  it("the company's day can differ from the UTC day", () => {
    expect(dayKeyIn(NY, new Date("2026-11-19T02:00:00Z"))).toBe("2026-11-18");
    expect(dayKeyIn("Asia/Tokyo", new Date("2026-11-18T16:00:00Z"))).toBe("2026-11-19");
  });
});

describe("clockInReminderTimes", () => {
  it("is off by default and with a broken time", () => {
    expect(clockInReminderTimes({ ...base, enabled: false })).toEqual([]);
    expect(clockInReminderTimes({ ...base, time: "" })).toEqual([]);
    expect(clockInReminderTimes({ ...base, timezone: "Mars/Olympus" })).toEqual([]);
  });

  it("without a schedule: the next seven days, work days only, at the company time", () => {
    const out = clockInReminderTimes(base);
    // Wed 18 … Tue 24, Sunday 22 is off.
    expect(out.map((r) => r.dayKey)).toEqual([
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
      "2026-11-23",
      "2026-11-24",
    ]);
    expect(out[0]?.at.toISOString()).toBe("2026-11-18T12:00:00.000Z");
    expect(out.every((r) => r.siteName === undefined)).toBe(true);
  });

  it("never schedules a time already past, and skips today once clocked in", () => {
    const afterSeven = new Date("2026-11-18T12:00:00Z");
    expect(clockInReminderTimes({ ...base, now: afterSeven })[0]?.dayKey).toBe("2026-11-19");
    expect(clockInReminderTimes({ ...base, now: new Date("2026-11-18T11:59:00Z") })[0]?.dayKey).toBe("2026-11-18");
    expect(clockInReminderTimes({ ...base, skipToday: true })[0]?.dayKey).toBe("2026-11-19");
  });

  it("with a schedule: only the scheduled days, at the entry's start time when it has one", () => {
    const out = clockInReminderTimes({
      ...base,
      entries: [
        { dayKey: "2026-11-19", startTime: "06:30", siteName: "Main St" },
        { dayKey: "2026-11-22", siteName: "Oak Ave" },
        // Outside the window: neither scheduled nor a reason to drop the work days.
        { dayKey: "2026-11-30", startTime: "05:00" },
      ],
    });
    expect(out).toEqual([
      { dayKey: "2026-11-19", at: new Date("2026-11-19T11:30:00Z"), siteName: "Main St" },
      // A Sunday: the schedule wins over the work days.
      { dayKey: "2026-11-22", at: new Date("2026-11-22T12:00:00Z"), siteName: "Oak Ave" },
    ]);
  });

  it("entries beyond the week do not switch the work-day fallback off, and a bad start time falls back", () => {
    expect(clockInReminderTimes({ ...base, entries: [{ dayKey: "2026-11-30" }] })).toHaveLength(6);
    const out = clockInReminderTimes({ ...base, entries: [{ dayKey: "2026-11-19", startTime: "noon" }] });
    expect(iso(out)).toEqual(["2026-11-19T12:00:00.000Z"]);
  });

  it("a scheduled start already past today is dropped, the later days stay", () => {
    const out = clockInReminderTimes({
      ...base,
      entries: [
        { dayKey: "2026-11-18", startTime: "04:00" },
        { dayKey: "2026-11-19", startTime: "04:00" },
      ],
    });
    expect(iso(out)).toEqual(["2026-11-19T09:00:00.000Z"]);
  });

  it("uses the company's today when the phone (and UTC) are already on the next day", () => {
    // 21:00 on Tuesday the 17th in New York; UTC is already Wednesday.
    const out = clockInReminderTimes({ ...base, now: new Date("2026-11-18T02:00:00Z") });
    expect(out[0]).toMatchObject({ dayKey: "2026-11-18", at: new Date("2026-11-18T12:00:00Z") });
    expect(out.at(-1)?.dayKey).toBe("2026-11-23");
  });

  it("keeps 07:00 local across both DST changes", () => {
    const fall = clockInReminderTimes({
      ...base,
      now: new Date("2026-10-30T20:00:00Z"),
      workDays: [0, 1, 2, 3, 4, 5, 6],
    });
    expect(iso(fall).slice(0, 3)).toEqual([
      "2026-10-31T11:00:00.000Z",
      "2026-11-01T12:00:00.000Z",
      "2026-11-02T12:00:00.000Z",
    ]);
    const spring = clockInReminderTimes({
      ...base,
      now: new Date("2027-03-12T20:00:00Z"),
      workDays: [0, 1, 2, 3, 4, 5, 6],
    });
    expect(iso(spring).slice(0, 3)).toEqual([
      "2027-03-13T12:00:00.000Z",
      "2027-03-14T11:00:00.000Z",
      "2027-03-15T11:00:00.000Z",
    ]);
  });
});

describe("schedule helpers", () => {
  it("day keys are calendar days", () => {
    expect(addDaysKey("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDaysKey("2026-11-01", 1)).toBe("2026-11-02");
    expect(addDaysKey("2027-01-01", -1)).toBe("2026-12-31");
    expect(weekdayOfKey("2026-11-18")).toBe(3);
    expect(weekdayOfKey("2026-11-22")).toBe(0);
  });

  it("next days start today, soonest first, three at most", () => {
    const entries = ["2026-11-25", "2026-11-17", "2026-11-18", "2026-11-20", "2026-11-19"].map((dayKey) => ({
      dayKey,
    }));
    expect(upcomingEntries(entries, "2026-11-18").map((e) => e.dayKey)).toEqual([
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
    ]);
    expect(upcomingEntries(entries, "2026-11-26")).toEqual([]);
    expect(upcomingEntries([], "2026-11-18")).toEqual([]);
  });

  it("names today and tomorrow, across a month end", () => {
    expect(relativeDay("2026-11-18", "2026-11-18")).toBe("today");
    expect(relativeDay("2026-12-01", "2026-11-30")).toBe("tomorrow");
    expect(relativeDay("2026-11-20", "2026-11-18")).toBeNull();
  });
});
