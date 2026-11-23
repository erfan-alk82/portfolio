import type { MetadataRoute } from "next";
import { caseStudies } from "@/content";
import { locales } from "@/i18n/config";
import { languageAlternates, siteUrl } from "@/lib/site";

/** Home and every case study, each listed per language with its hreflang alternates. */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    ...caseStudies.map((study) => `/case-studies/${study.slug}`),
  ];
  return paths.flatMap((path) => {
    const languages = languageAlternates(siteUrl, path);
    return locales.map((locale) => ({
      url: new URL(`/${locale}${path}`, siteUrl).href,
      alternates: { languages },
    }));
  });
}
