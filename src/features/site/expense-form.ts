import type { SiteExpenseInput, SiteExpenseKind } from "../../lib/api-types";
import { parseCents } from "../../lib/money";

export const EXPENSE_KINDS: SiteExpenseKind[] = ["material", "service", "other"];

export interface ExpenseForm {
  kind: SiteExpenseKind;
  description: string;
  amount: string;
  date: string;
  vendor: string;
}

export type ExpenseFormResult = { ok: true; input: SiteExpenseInput } | { ok: false; error: "description" | "amount" | "date" };

/** A real calendar day written as YYYY-MM-DD ("2026-02-30" is not one). */
export function isValidDayKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const d = new Date(`${key}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === key;
}

/** Same limits as the server (description 1..200, vendor <= 120, amount > 0); the server still has the last word. */
export function parseExpenseForm(form: ExpenseForm): ExpenseFormResult {
  const description = form.description.trim();
  if (description.length < 1 || description.length > 200) return { ok: false, error: "description" };
  const amountCents = parseCents(form.amount);
  if (amountCents === null) return { ok: false, error: "amount" };
  const spentOn = form.date.trim();
  if (!isValidDayKey(spentOn)) return { ok: false, error: "date" };
  const vendor = form.vendor.trim().slice(0, 120);
  return { ok: true, input: { kind: form.kind, description, amountCents, spentOn, ...(vendor ? { vendor } : {}) } };
}
