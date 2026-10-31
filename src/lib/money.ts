/**
 * "123.45", "123,45", "1,234.56", "1.234,56" or "$ 50" → cents. Null when empty, not a number,
 * zero, or with 4+ digits after the last separator. The last separator is the decimal one when
 * 1-2 digits follow it; with exactly 3 digits it is a thousands mark ("1.234" → 123400).
 */
export function parseCents(raw: string): number | null {
  const s = raw.replace(/[\s$]/g, "");
  if (!/^\d[\d.,]*$/.test(s)) return null;
  const last = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
  const after = last >= 0 ? s.length - last - 1 : 0;
  if (after > 3) return null;
  const decimal = after === 1 || after === 2;
  const whole = (decimal ? s.slice(0, last) : s).replace(/[.,]/g, "");
  const frac = decimal ? s.slice(last + 1).padEnd(2, "0") : "00";
  const cents = Number(whole) * 100 + Number(frac);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}
