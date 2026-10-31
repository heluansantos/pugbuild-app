import { isValidDayKey, parseExpenseForm } from "../features/site/expense-form";

const base = { kind: "material" as const, description: " Drywall ", amount: "1.234,50", date: "2026-10-21", vendor: "" };

describe("expense form", () => {
  it("builds the API input and trims text", () => {
    expect(parseExpenseForm(base)).toEqual({ ok: true, input: { kind: "material", description: "Drywall", amountCents: 123450, spentOn: "2026-10-21" } });
    expect(parseExpenseForm({ ...base, vendor: " Home Depot " })).toMatchObject({ ok: true, input: { vendor: "Home Depot" } });
  });
  it("reports the first invalid field", () => {
    expect(parseExpenseForm({ ...base, description: "  " })).toEqual({ ok: false, error: "description" });
    expect(parseExpenseForm({ ...base, description: "x".repeat(201) })).toEqual({ ok: false, error: "description" });
    expect(parseExpenseForm({ ...base, amount: "0" })).toEqual({ ok: false, error: "amount" });
    expect(parseExpenseForm({ ...base, date: "21/10/2026" })).toEqual({ ok: false, error: "date" });
  });
  it("only accepts real calendar days", () => {
    expect(isValidDayKey("2026-02-28")).toBe(true);
    expect(isValidDayKey("2026-02-30")).toBe(false);
    expect(isValidDayKey("2026-13-01")).toBe(false);
  });
});
