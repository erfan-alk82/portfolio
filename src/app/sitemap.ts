import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { languageAlternates, siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = languageAlternates(siteUrl);
  return locales.map((locale) => ({
    url: new URL(`/${locale}`, siteUrl).href,
    alternates: { languages },
  }));
}
