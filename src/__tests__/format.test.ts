import { formatClock, formatMinutes, formatMoney, formatPhone, formatWeekRange, dayParts, normalizePhone, shortName } from "../lib/format";

describe("formatters", () => {
  it("formats minutes like the web", () => {
    expect(formatMinutes(342)).toBe("5h42");
    expect(formatMinutes(0)).toBe("0h00");
    expect(formatMinutes(-5)).toBe("0h00");
    expect(formatClock(342)).toBe("05:42");
  });

  it("formats money in USD", () => {
    expect(formatMoney(116250, "en")).toBe("$1,162.50");
    expect(formatMoney(0, "pt")).toContain("0,00");
  });

  it("normalizes US phones to E.164", () => {
    expect(normalizePhone("(978) 555-0111")).toBe("+19785550111");
    expect(normalizePhone("19785550111")).toBe("+19785550111");
    expect(normalizePhone("+55 11 98888-7777")).toBe("+5511988887777");
    expect(normalizePhone("123")).toBeNull();
    expect(formatPhone("+19785550111")).toBe("(978) 555-0111");
  });

  it("shortens names", () => {
    expect(shortName("Carlos Mendes")).toBe("Carlos M.");
    expect(shortName("Ana")).toBe("Ana");
  });

  it("reads day keys as calendar days regardless of device timezone", () => {
    expect(dayParts("2026-10-21", "en")).toEqual({ label: "Wed", day: 21, weekday: 3 });
    expect(formatWeekRange("2026-10-21", "2026-10-27", "en")).toBe("Wed 21 – Tue 27 Oct");
    expect(formatWeekRange("2026-10-28", "2026-11-03", "en")).toBe("Wed 28 Oct – Tue 3 Nov");
  });
});
