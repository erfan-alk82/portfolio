import type { Locale } from "@/i18n/config";
import { plainText } from "@/lib/rich";
import { siteUrl } from "@/lib/site";

type Props = {
  locale: Locale;
  slug: string;
  title: string;
  summary: string;
};

/** schema.org CreativeWork authored by the same Person entity as the home page. */
export function CaseStudyJsonLd({ locale, slug, title, summary }: Props) {
  const url = new URL(`/${locale}/case-studies/${slug}`, siteUrl).href;
  const data = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: plainText(title),
    description: summary,
    url,
    inLanguage: locale,
    author: { "@id": new URL("/#person", siteUrl).href },
    image: new URL(`/og/${locale}.png`, siteUrl).href,
  };
  // Escaping "<" keeps the JSON from ever closing the script element early.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
