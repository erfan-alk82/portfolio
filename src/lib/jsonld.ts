import type { Locale } from "@/i18n/config";

/**
 * The site's one Person, inlined (with the same @id everywhere) so each page's
 * structured data stands on its own instead of pointing at a node that lives
 * on another page.
 */
export function personNode(base: URL, locale: Locale, name: string): Record<string, string> {
  return {
    "@type": "Person",
    "@id": new URL("/#person", base).href,
    name,
    url: new URL(`/${locale}`, base).href,
  };
}

/** The JSON escape for "<" (backslash, "u003c"), built so no tool rewrites it into a literal "<". */
const ESCAPED_LT = `${String.fromCharCode(92)}u003c`;

/** JSON for an inline <script>: escaping "<" means the data can never close the element. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, ESCAPED_LT);
}
