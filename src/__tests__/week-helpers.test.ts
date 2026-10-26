import { buildDayBars, buildWeekStrip, minutesByDay } from "../lib/week-helpers";

const dayKeys = ["2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27"];

describe("week helpers", () => {
  it("builds the strip states from today and work days", () => {
    const strip = buildWeekStrip(dayKeys, new Set(["2026-10-21"]), "2026-10-23", [1, 2, 3, 4, 5, 6], "pt");
    expect(strip.map((d) => d.state)).toEqual(["worked", "off", "today", "future", "off", "future", "future"]);
    expect(strip[0]).toMatchObject({ label: "Qua", day: 21 });
  });

  it("scales bars against the busiest day, at least one hour", () => {
    const byDay = minutesByDay([
      { dayKey: "2026-10-21", status: "closed", workedMinutes: 480 },
      { dayKey: "2026-10-22", status: "open" },
    ], 120);
    const bars = buildDayBars(dayKeys, byDay, "2026-10-22", "en");
    expect(bars[0]?.ratio).toBe(1);
    expect(bars[1]).toMatchObject({ minutes: 120, ratio: 0.25, isToday: true });
    expect(bars[2]?.minutes).toBe(0);
  });
});
