import { defaultLocale, locales } from "@/i18n/config";

interface SiteEnv {
  SITE_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  NODE_ENV?: string;
}

const LOCAL_URL = "http://localhost:3000";

/**
 * The public origin used for canonical URLs, hreflang, the sitemap and
 * social images. Production builds must know it: SITE_URL, or Vercel's
 * production host. Falling back to localhost there would poison indexing.
 */
export function resolveSiteUrl(env: SiteEnv): URL {
  const explicit = env.SITE_URL?.trim();
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const raw = explicit || (vercel ? `https://${vercel}` : "");

  if (!raw) {
    if (env.NODE_ENV === "production") {
      throw new Error("SITE_URL is required for production builds (for example https://erfan.dev)");
    }
    return new URL(LOCAL_URL);
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`SITE_URL must be an absolute http(s) URL, received "${raw}"`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`SITE_URL must use http or https, received "${raw}"`);
  }
  return url;
}

export const siteUrl = resolveSiteUrl({
  SITE_URL: process.env.SITE_URL,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  NODE_ENV: process.env.NODE_ENV,
});

/**
 * hreflang map shared by page metadata and the sitemap so they cannot drift.
 * x-default is the default locale itself, not "/" (which redirects).
 */
export function languageAlternates(base: URL): Record<string, string> {
  const entries = locales.map((locale) => [locale, new URL(`/${locale}`, base).href]);
  return Object.fromEntries([...entries, ["x-default", new URL(`/${defaultLocale}`, base).href]]);
}
