import type { Locale } from "@/i18n/config";

const YEAR_MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

function parseYearMonth(value: string): { year: number; month: number } {
  const match = YEAR_MONTH.exec(value);
  if (!match) throw new Error(`Expected a YYYY-MM month, received "${value}"`);
  return { year: Number(match[1]), month: Number(match[2]) };
}

const persianYearFormat = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
  year: "numeric",
  timeZone: "UTC",
});

function persianYearOf(date: Date): number {
  return Number.parseInt(persianYearFormat.format(date), 10);
}

/**
 * The Solar Hijri year that a Gregorian month falls in.
 * The CV only records months, so a month that spans Nowruz has no single
 * answer. In that case this throws rather than invent precision.
 */
export function jalaliYear(value: string): number {
  const { year, month } = parseYearMonth(value);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(year, month, 0));
  const start = persianYearOf(first);
  if (start !== persianYearOf(last)) {
    throw new Error(`${value} straddles Nowruz; its Solar Hijri year is ambiguous`);
  }
  return start;
}

const englishMonth = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const persianDigits = new Intl.NumberFormat("fa-IR", { useGrouping: false });

function formatPoint(locale: Locale, value: string): string {
  if (locale === "fa") return persianDigits.format(jalaliYear(value));
  const { year, month } = parseYearMonth(value);
  return englishMonth.format(new Date(Date.UTC(year, month - 1, 1)));
}

/** "2022" in English, "۱۴۰۱" in Persian. */
export function formatYear(locale: Locale, value: string): string {
  if (locale === "fa") return persianDigits.format(jalaliYear(value));
  return String(parseYearMonth(value).year);
}

const PRESENT: Record<Locale, string> = { en: "Present", fa: "اکنون" };

/** Posts are written in Tehran, so their dates follow Tehran's calendar day. */
const postDateFormat: Record<Locale, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Tehran" }),
  fa: new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Tehran",
  }),
};

/** "1 November 2026" in English, "۱۰ آبان ۱۴۰۵" in Persian (Solar Hijri). */
export function formatPostDate(locale: Locale, iso: string): string {
  return postDateFormat[locale].format(new Date(iso));
}

/** Compact "2021–2023" / "۱۴۰۰–۱۴۰۲" for space-constrained labels such as the hero map. */
export function formatYearSpan(locale: Locale, start: string, end: string | null): string {
  const to = end === null ? PRESENT[locale] : formatYear(locale, end);
  return `${formatYear(locale, start)}–${to}`;
}

/**
 * "Jul 2024 – Sep 2025" in English, "۱۴۰۳ – ۱۴۰۴" in Persian. Persian shows years only,
 * so a period inside one year collapses to that year instead of "۱۴۰۲ – ۱۴۰۲".
 */
export function formatPeriod(locale: Locale, start: string, end: string | null): string {
  const from = formatPoint(locale, start);
  const to = end === null ? PRESENT[locale] : formatPoint(locale, end);
  return from === to ? from : `${from} – ${to}`;
}
