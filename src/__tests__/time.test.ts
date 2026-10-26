import { computeElapsed, computeWorked } from "../lib/time";

const lunch = { minutes: 30, paid: false, minShiftMinutes: 6 * 60 };
const at = (h: number, m = 0) => new Date(Date.UTC(2026, 9, 21, h, m));

describe("lunch rule", () => {
  it("deducts lunch once the shift reaches the minimum", () => {
    expect(computeWorked(at(7), at(15, 30), lunch)).toEqual({ spanMinutes: 510, lunchDeductedMinutes: 30, workedMinutes: 480 });
  });
  it("does not deduct on short shifts or paid lunch", () => {
    expect(computeWorked(at(7), at(11), lunch).lunchDeductedMinutes).toBe(0);
    expect(computeWorked(at(7), at(16), { ...lunch, paid: true }).workedMinutes).toBe(540);
  });
  it("never goes negative", () => {
    expect(computeElapsed(at(9), at(8), lunch).workedMinutes).toBe(0);
  });
});
