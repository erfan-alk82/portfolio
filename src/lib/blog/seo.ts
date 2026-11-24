import type { Metadata } from "next";
import { locales, type Locale } from "@/i18n/config";
import { personNode } from "@/lib/jsonld";
import { plainText } from "@/lib/rich";
import { truncateGraphemes } from "@/lib/text";

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
  /** Title of the language's RSS feed, for a titled <link rel="alternate">. */
  feedTitle: string;
}

export function buildPostMetadata(post: PublicPost, { base, siteName, feedTitle }: MetadataOptions): Metadata {
  const path = postPath(post.locale, post.slug);
  const title = `${plainText(post.title)} | ${siteName}`;
  const image = { url: `/og/${post.locale}.png`, width: 1200, height: 630, alt: title };

  return {
    title,
    description: post.description,
    alternates: {
      canonical: path,
      languages: postAlternates(base, post.slug, post.publishedLocales),
      types: { "application/rss+xml": [{ url: feedPath(post.locale), title: feedTitle }] },
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

/** schema.org allows long headlines, but Google only shows about 110 characters. */
const HEADLINE_MAX = 110;

export function blogId(base: URL, locale: Locale): string {
  return new URL(`/${locale}/blog#blog`, base).href;
}

interface BlogPostingOptions {
  base: URL;
  /** The site owner's name in the post's language. */
  authorName: string;
  /** Name of the blog in the post's language (the feed title). */
  blogName: string;
}

/**
 * schema.org BlogPosting. Author, page and blog are inlined as small nodes
 * (with the same @ids used elsewhere), so the page validates on its own.
 */
export function blogPostingJsonLd(post: PublicPost, { base, authorName, blogName }: BlogPostingOptions): Record<string, unknown> {
  const url = new URL(postPath(post.locale, post.slug), base).href;
  const person = personNode(base, post.locale, authorName);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: truncateGraphemes(plainText(post.title), HEADLINE_MAX),
    description: post.description,
    inLanguage: post.locale,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: person,
    publisher: person,
    image: new URL(`/og/${post.locale}.png`, base).href,
    isPartOf: {
      "@type": "Blog",
      "@id": blogId(base, post.locale),
      name: blogName,
      url: new URL(`/${post.locale}/blog`, base).href,
      inLanguage: post.locale,
    },
  };
}

interface BlogOptions {
  base: URL;
  locale: Locale;
  name: string;
  description: string;
  authorName: string;
}

/** The Blog node itself, on the blog index; posts refer to it by the same @id. */
export function blogJsonLd({ base, locale, name, description, authorName }: BlogOptions): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": blogId(base, locale),
    name,
    description,
    url: new URL(`/${locale}/blog`, base).href,
    inLanguage: locale,
    author: personNode(base, locale, authorName),
  };
}
