import type { MetadataRoute } from "next";
import { locales, type Locale } from "@/i18n/config";
import { languageAlternates } from "@/lib/site";
import { postAlternates, postPath } from "./seo";

export interface SitemapPost {
  slug: string;
  locale: Locale;
  /** ISO 8601 */
  publishedAt: string;
  /** ISO 8601; changes only when this translation's own content changes. */
  updatedAt: string;
}

const BLOG_INDEX = "/blog";

/** ISO strings of one format compare correctly as strings. */
const later = (a: string, b: string): string => (a > b ? a : b);

function postLastModified(post: SitemapPost): string {
  return later(post.updatedAt, post.publishedAt);
}

function newestIn(posts: readonly SitemapPost[], locale: Locale): string | undefined {
  return posts.filter((p) => p.locale === locale).map(postLastModified).reduce<string | undefined>(
    (newest, date) => (newest ? later(newest, date) : date),
    undefined,
  );
}

/**
 * Static pages in every language (the blog index dated by its newest post),
 * then one entry per published translation with hreflang for the languages
 * that exist.
 */
export function buildSitemap(base: URL, staticPaths: readonly string[], posts: readonly SitemapPost[]): MetadataRoute.Sitemap {
  const pages = staticPaths.flatMap((path) => {
    const languages = languageAlternates(base, path);
    return locales.map((locale) => {
      const lastModified = path === BLOG_INDEX ? newestIn(posts, locale) : undefined;
      return { url: new URL(`/${locale}${path}`, base).href, alternates: { languages }, ...(lastModified ? { lastModified } : {}) };
    });
  });

  const localesBySlug = new Map<string, Locale[]>();
  for (const post of posts) localesBySlug.set(post.slug, [...(localesBySlug.get(post.slug) ?? []), post.locale]);
  const articles = posts.map((post) => ({
    url: new URL(postPath(post.locale, post.slug), base).href,
    lastModified: postLastModified(post),
    alternates: { languages: postAlternates(base, post.slug, localesBySlug.get(post.slug) ?? [post.locale]) },
  }));

  return [...pages, ...articles];
}
