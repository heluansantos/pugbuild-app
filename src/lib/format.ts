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

/** Seconds on the shift → "0:42:07" so the person sees the clock move the instant they start. */
export function formatClockSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const sec = safe % 60;
  return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
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

/** Intl formatters are expensive to build; the clock re-renders every second, so reuse them. */
const formatters = new Map<string, Intl.DateTimeFormat>();
export function dtf(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, f);
  }
  return f;
}

/** "07:02" in the company timezone ("h23": never "24:05"). */
export function formatTime(date: Date, timezone: string, locale: string): string {
  return dtf(toIntlLocale(locale), { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: timezone }).format(date);
}

/** "Terça, 20 de outubro" / "Tuesday, October 20". */
export function formatLongDate(date: Date, timezone: string, locale: string): string {
  return cap(
    dtf(toIntlLocale(locale), {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: timezone,
    }).format(date),
  );
}

/** Today's YYYY-MM-DD in the company timezone (a due date compares against this, never against UTC). */
export function todayKeyIn(timezone: string): string {
  // formatToParts, not a locale's date pattern: ICU data differs between devices.
  const parts = dtf("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** A YYYY-MM-DD key as a Date at noon UTC: format it with timeZone "UTC" to read the calendar day back. */
export function keyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12));
}

/** Short weekday + day number for a day key: { label: "Qua", day: 14, weekday: 3 }. */
export function dayParts(key: string, locale: string): { label: string; day: number; weekday: number } {
  const d = keyToDate(key);
  const label = dtf(toIntlLocale(locale), { weekday: "short", timeZone: "UTC" })
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
    cap(dtf(il, { weekday: "short", timeZone: "UTC" }).format(d).replace(".", ""));
  const mo = (d: Date) =>
    dtf(il, { month: "short", timeZone: "UTC" }).format(d).replace(".", "");
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const a = sameMonth
    ? `${wd(start)} ${start.getUTCDate()}`
    : `${wd(start)} ${start.getUTCDate()} ${mo(start)}`;
  return `${a} – ${wd(end)} ${end.getUTCDate()} ${mo(end)}`;
}

/** "20 out" / "Oct 20" */
export function formatShortDate(date: Date, timezone: string, locale: string): string {
  return dtf(toIntlLocale(locale), {
    day: "numeric",
    month: "short",
    timeZone: timezone,
  }).format(date);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
