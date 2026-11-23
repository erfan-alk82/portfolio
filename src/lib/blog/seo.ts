import type { Metadata } from "next";
import { locales, type Locale } from "@/i18n/config";
import { plainText } from "@/lib/rich";

/** A published translation as the public pages see it. Dates are ISO strings. */
export interface PublicPost {
  slug: string;
  locale: Locale;
  title: string;
  description: string;
  bodyMd: string;
  publishedAt: string;
  updatedAt: string;
  /** Every language this slug is published in, including `locale`. */
  publishedLocales: readonly Locale[];
}

export const OPEN_GRAPH_LOCALE: Record<Locale, string> = { fa: "fa_IR", en: "en_US" };

export function postPath(locale: Locale, slug: string): string {
  return `/${locale}/blog/${slug}`;
}

export function feedPath(locale: Locale): string {
  return `/${locale}/feed.xml`;
}

/**
 * hreflang map for one post. Only published languages are listed, so a
 * Persian-only post never points crawlers at a missing English page.
 * x-default is Persian (the site default) when it exists, else English.
 */
export function postAlternates(base: URL, slug: string, published: readonly Locale[]): Record<string, string> {
  const available = locales.filter((locale) => published.includes(locale));
  const entries = available.map((locale) => [locale, new URL(postPath(locale, slug), base).href] as const);
  const fallback = available.includes("fa") ? "fa" : available[0];
  if (!fallback) return {};
  return Object.fromEntries([...entries, ["x-default", new URL(postPath(fallback, slug), base).href]]);
}

interface MetadataOptions {
  base: URL;
  siteName: string;
}

export function buildPostMetadata(post: PublicPost, { base, siteName }: MetadataOptions): Metadata {
  const path = postPath(post.locale, post.slug);
  const title = `${plainText(post.title)} | ${siteName}`;
  const image = { url: `/og/${post.locale}.png`, width: 1200, height: 630, alt: title };

  return {
    title,
    description: post.description,
    alternates: {
      canonical: path,
      languages: postAlternates(base, post.slug, post.publishedLocales),
      types: { "application/rss+xml": feedPath(post.locale) },
    },
    // A nested openGraph object replaces the layout's one entirely, so every field is restated.
    openGraph: {
      type: "article",
      url: path,
      siteName,
      title,
      description: post.description,
      locale: OPEN_GRAPH_LOCALE[post.locale],
      alternateLocale: post.publishedLocales
        .filter((locale) => locale !== post.locale)
        .map((locale) => OPEN_GRAPH_LOCALE[locale]),
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: post.description,
      images: [image],
    },
  };
}

/** schema.org BlogPosting authored by the same Person entity as the home page. */
export function blogPostingJsonLd(post: PublicPost, { base }: { base: URL }): Record<string, unknown> {
  const url = new URL(postPath(post.locale, post.slug), base).href;
  const person = { "@id": new URL("/#person", base).href };
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: plainText(post.title),
    description: post.description,
    inLanguage: post.locale,
    url,
    mainEntityOfPage: url,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: person,
    publisher: person,
    image: new URL(`/og/${post.locale}.png`, base).href,
    isPartOf: { "@type": "Blog", "@id": new URL(`/${post.locale}/blog#blog`, base).href },
  };
}

/** JSON for an inline <script>: escaping "<" means the data can never close the element. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
