import { defaultLocale, isLocale, type Locale } from "./config";

interface NegotiationInput {
  cookie?: string;
  acceptLanguage?: string | null;
}

interface WeightedTag {
  base: string;
  q: number;
}

function parseAcceptLanguage(header: string): WeightedTag[] {
  return header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      return { base: tag.trim().toLowerCase().split("-")[0], q: Number.isNaN(q) ? 0 : q };
    })
    .filter((entry) => entry.base.length > 0 && entry.q > 0)
    .sort((a, b) => b.q - a.q);
}

/**
 * Chooses the locale for a request that arrived without one in its path.
 * Order: remembered cookie, then the browser's languages, then Persian.
 */
export function pickLocale({ cookie, acceptLanguage }: NegotiationInput): Locale {
  if (isLocale(cookie)) return cookie;

  const match = parseAcceptLanguage(acceptLanguage ?? "").find((entry) => isLocale(entry.base));
  return match && isLocale(match.base) ? match.base : defaultLocale;
}
