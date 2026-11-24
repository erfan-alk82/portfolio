export const locales = ["fa", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fa";

/** Cookie that remembers the visitor's last chosen language. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** One year, in seconds. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type Direction = "rtl" | "ltr";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export function directionOf(locale: Locale): Direction {
  return locale === "fa" ? "rtl" : "ltr";
}


/** English names of the site's languages, for English-only UI such as the admin. */
export const LANGUAGE_NAME_EN: Record<Locale, string> = { fa: "Persian", en: "English" };
