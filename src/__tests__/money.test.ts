import { parseCents } from "../lib/money";

describe("parseCents", () => {
  it("reads dot and comma decimals", () => {
    expect(parseCents("123.45")).toBe(12345);
    expect(parseCents("123,45")).toBe(12345);
    expect(parseCents("50")).toBe(5000);
    expect(parseCents("12.5")).toBe(1250);
    expect(parseCents("0,99")).toBe(99);
  });
  it("handles thousands separators and symbols", () => {
    expect(parseCents("1,234.56")).toBe(123456);
    expect(parseCents("1.234,56")).toBe(123456);
    expect(parseCents("$ 1,200")).toBe(120000);
    expect(parseCents(" 7 ")).toBe(700);
  });
  it("rejects empty, zero, negative and malformed input", () => {
    for (const bad of ["", " ", "0", "0.00", "-5", "abc", "12.3456", "1e3", ".5"]) expect(parseCents(bad)).toBeNull();
  });
});
