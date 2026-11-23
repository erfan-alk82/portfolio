import type { Locale } from "@/i18n/config";

/** Months since year zero, so "2021-08" and "2023-06" can be subtracted. */
export function monthValue(yearMonth: string): number {
  const [year, month] = yearMonth.split("-").map(Number);
  return year * 12 + (month - 1);
}

export interface TimeScale {
  /** x for the start of a YYYY-MM month. */
  x: (yearMonth: string) => number;
  /** x for a fractional month value. */
  xAt: (value: number) => number;
  from: number;
  to: number;
}

interface ScaleOptions {
  from: string;
  to: string;
  x0: number;
  x1: number;
}

/** Linear time axis: the hero map's horizontal position is time. */
export function timeScale({ from, to, x0, x1 }: ScaleOptions): TimeScale {
  const start = monthValue(from);
  const end = monthValue(to);
  const xAt = (value: number): number => x0 + ((value - start) / (end - start)) * (x1 - x0);
  return { x: (yearMonth) => xAt(monthValue(yearMonth)), xAt, from: start, to: end };
}

export interface Tick {
  x: number;
  label: string;
}

/** Nowruz (1 Farvardin) falls on 20 or 21 March; the 21st is close enough for a map scale. */
const NOWRUZ_MONTH_OFFSET = 2 + 20 / 31;
/** Solar Hijri year N begins in Gregorian year N + 621. */
const HIJRI_OFFSET = 621;

const persianDigits = new Intl.NumberFormat("fa-IR", { useGrouping: false });

/** Year boundaries inside the scale: 1 January in English, Nowruz in Persian. */
export function yearTicks(locale: Locale, scale: TimeScale): Tick[] {
  const firstYear = Math.floor(scale.from / 12);
  const lastYear = Math.floor(scale.to / 12);
  const ticks: Tick[] = [];
  for (let year = firstYear; year <= lastYear; year++) {
    const value = year * 12 + (locale === "fa" ? NOWRUZ_MONTH_OFFSET : 0);
    if (value <= scale.from || value > scale.to) continue;
    const label = locale === "fa" ? persianDigits.format(year - HIJRI_OFFSET) : String(year);
    ticks.push({ x: scale.xAt(value), label });
  }
  return ticks;
}
