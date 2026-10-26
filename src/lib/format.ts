import type { Locale } from "./api-types";

const intlLocale: Record<Locale, string> = { en: "en-US", pt: "pt-BR", es: "es-US" };

export function toIntlLocale(locale: string): string {
  return intlLocale[locale as Locale] ?? locale;
}

/** 342 → "5h42" */
export function formatMinutes(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

/** 342 → "05:42" */
export function formatClock(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** Cents → "$1,162.50" (locale aware, USD). */
export function formatMoney(cents: number, locale = "en"): string {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
  }).format(cents / 100);
}

export function formatDistance(meters: number, locale = "en"): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${new Intl.NumberFormat(toIntlLocale(locale), { maximumFractionDigits: 1 }).format(meters / 1000)} km`;
}

/** "Carlos Mendes" → "Carlos M." */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1] : undefined;
  return last ? `${first} ${last[0]?.toUpperCase()}.` : first;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** "+19785550111" → "(978) 555-0111"; other countries keep the E.164 form. */
export function formatPhone(e164: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}

/** Digits typed by a US worker → E.164. Accepts 10 digits or 11 starting with 1, or a full +… number. */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) {
    const digits = trimmed.replace(/\D/g, "");
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/** "07:02" in the company timezone. */
export function formatTime(date: Date, timezone: string, locale: string): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(date);
}

/** "Terça, 20 de outubro" / "Tuesday, October 20". */
export function formatLongDate(date: Date, timezone: string, locale: string): string {
  return cap(
    new Intl.DateTimeFormat(toIntlLocale(locale), {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: timezone,
    }).format(date),
  );
}

/** A YYYY-MM-DD key as a Date at noon UTC: format it with timeZone "UTC" to read the calendar day back. */
export function keyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12));
}

/** Short weekday + day number for a day key: { label: "Qua", day: 14, weekday: 3 }. */
export function dayParts(key: string, locale: string): { label: string; day: number; weekday: number } {
  const d = keyToDate(key);
  const label = new Intl.DateTimeFormat(toIntlLocale(locale), { weekday: "short", timeZone: "UTC" })
    .format(d)
    .replace(".", "");
  return { label: cap(label), day: d.getUTCDate(), weekday: d.getUTCDay() };
}

/** "Qua 14 – Ter 20 out" for a pay week from its day keys. */
export function formatWeekRange(startKey: string, endKey: string, locale: string): string {
  const start = keyToDate(startKey);
  const end = keyToDate(endKey);
  const il = toIntlLocale(locale);
  const wd = (d: Date) =>
    cap(new Intl.DateTimeFormat(il, { weekday: "short", timeZone: "UTC" }).format(d).replace(".", ""));
  const mo = (d: Date) =>
    new Intl.DateTimeFormat(il, { month: "short", timeZone: "UTC" }).format(d).replace(".", "");
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const a = sameMonth
    ? `${wd(start)} ${start.getUTCDate()}`
    : `${wd(start)} ${start.getUTCDate()} ${mo(start)}`;
  return `${a} – ${wd(end)} ${end.getUTCDate()} ${mo(end)}`;
}

/** "20 out" / "Oct 20" */
export function formatShortDate(date: Date, timezone: string, locale: string): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    day: "numeric",
    month: "short",
    timeZone: timezone,
  }).format(date);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
