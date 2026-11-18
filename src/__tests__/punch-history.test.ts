import { historyLines, isPunchEdited } from "../lib/punch-history";

const IN = "2026-11-10T12:00:00.000Z";
const OUT = "2026-11-10T21:00:00.000Z";

describe("punch history", () => {
  it("marks a punch as edited only by its flag", () => {
    expect(isPunchEdited({ flags: ["far_from_site", "edited"] })).toBe(true);
    expect(isPunchEdited({ flags: ["far_from_site"] })).toBe(false);
    expect(isPunchEdited({ flags: [] })).toBe(false);
  });

  it("a clock-in is a single value per field", () => {
    expect(historyLines({ action: "clock_in", after: { clockIn: IN, siteName: "Elm Street" } })).toEqual([
      { field: "clockIn", change: false, after: IN },
      { field: "siteName", change: false, after: "Elm Street" },
    ]);
  });

  it("an edit keeps old and new, also when one side is missing", () => {
    expect(historyLines({ action: "edit", before: { clockOut: OUT }, after: { clockOut: IN } })).toEqual([
      { field: "clockOut", change: true, before: OUT, after: IN },
    ]);
    expect(historyLines({ action: "edit", after: { clockOut: OUT } })).toEqual([
      { field: "clockOut", change: true, before: undefined, after: OUT },
    ]);
    expect(historyLines({ action: "edit", before: { siteName: "Elm Street" } })).toEqual([
      { field: "siteName", change: true, before: "Elm Street", after: undefined },
    ]);
  });

  it("a deletion shows what the punch was", () => {
    expect(historyLines({ action: "delete", before: { clockIn: IN, clockOut: OUT } })).toEqual([
      { field: "clockIn", change: false, after: IN },
      { field: "clockOut", change: false, after: OUT },
    ]);
  });

  it("an approval or a comment-only edit has no lines", () => {
    expect(historyLines({ action: "approve" })).toEqual([]);
    expect(historyLines({ action: "edit", before: {}, after: {} })).toEqual([]);
  });
});
