import type { MetadataRoute } from "next";
import { caseStudies } from "@/content";
import { locales } from "@/i18n/config";
import { postAlternates, postPath } from "@/lib/blog/seo";
import { languageAlternates, siteUrl } from "@/lib/site";
import { listPublished, type PublishedListItem } from "@/server/blog/queries";

/** Pages that exist in every language: home, the blog index and the case studies. */
function staticEntries(): MetadataRoute.Sitemap {
  const paths = ["", "/blog", ...caseStudies.map((study) => `/case-studies/${study.slug}`)];
  return paths.flatMap((path) => {
    const languages = languageAlternates(siteUrl, path);
    return locales.map((locale) => ({
      url: new URL(`/${locale}${path}`, siteUrl).href,
      alternates: { languages },
    }));
  });
}

/** One entry per published translation, with hreflang only for the languages that exist. */
function postEntries(items: readonly PublishedListItem[]): MetadataRoute.Sitemap {
  const localesBySlug = new Map<string, PublishedListItem["locale"][]>();
  for (const item of items) localesBySlug.set(item.slug, [...(localesBySlug.get(item.slug) ?? []), item.locale]);
  return items.map((item) => ({
    url: new URL(postPath(item.locale, item.slug), siteUrl).href,
    lastModified: item.updatedAt,
    alternates: { languages: postAlternates(siteUrl, item.slug, localesBySlug.get(item.slug) ?? [item.locale]) },
  }));
}

/**
 * Rendered per request (posts are published at runtime). If the database is
 * missing or down, listPublished() returns nothing and the static pages are
 * still listed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await listPublished();
  return [...staticEntries(), ...postEntries(posts.items)];
}
