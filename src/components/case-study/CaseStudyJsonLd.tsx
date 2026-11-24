import { getCopy } from "@/content";
import type { Locale } from "@/i18n/config";
import { personNode } from "@/lib/jsonld";
import { plainText } from "@/lib/rich";
import { siteUrl } from "@/lib/site";
import { JsonLd } from "@/components/ui/JsonLd";

type Props = {
  locale: Locale;
  slug: string;
  title: string;
  summary: string;
};

/**
 * schema.org CreativeWork. The author is inlined with the home page Person's
 * @id, so this page's structured data stands on its own.
 */
export function CaseStudyJsonLd({ locale, slug, title, summary }: Props) {
  const url = new URL(`/${locale}/case-studies/${slug}`, siteUrl).href;
  const data = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: plainText(title),
    description: summary,
    url,
    inLanguage: locale,
    author: personNode(siteUrl, locale, getCopy(locale).hero.name),
    image: new URL(`/og/${locale}.png`, siteUrl).href,
  };
  return <JsonLd data={data} />;
}
