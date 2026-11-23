import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import type { Locale } from "@/i18n/config";
import { SLUG_PATTERN, SLUG_MAX_LENGTH } from "@/lib/blog/schemas";
import type { PublicPost } from "@/lib/blog/seo";
import { isDatabaseConfigured } from "../db/client";
import { findPublishedPost, listPublishedTranslations } from "./repository";
import { POSTS_TAG, postTag } from "./tags";

/**
 * Public, cached blog reads. Each one first waits for a request
 * (connection()), so nothing touches the database at build time, then reads
 * through a remote cache that Server Actions expire with updateTag.
 *
 * Failures never break a page: without DATABASE_URL, or when the database is
 * unreachable, lists come back "unavailable" and posts as missing.
 */

export interface PublishedListItem {
  slug: string;
  locale: Locale;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
}

export type PublishedList = { status: "ok"; items: PublishedListItem[] } | { status: "unavailable"; items: [] };

async function cachedPublishedList(): Promise<PublishedListItem[]> {
  "use cache: remote";
  cacheLife("max");
  cacheTag(POSTS_TAG);
  const rows = await listPublishedTranslations();
  // Cached values must be plain data; dates travel as ISO strings.
  return rows.map((row) => ({
    ...row,
    publishedAt: row.publishedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

async function cachedPublishedPost(slug: string, locale: Locale): Promise<PublicPost | null> {
  "use cache: remote";
  cacheLife("max");
  cacheTag(POSTS_TAG, postTag(slug));
  const post = await findPublishedPost(slug, locale);
  if (!post) return null;
  return {
    slug: post.slug,
    locale: post.locale,
    title: post.title,
    description: post.description,
    bodyMd: post.bodyMd,
    publishedAt: post.publishedAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    publishedLocales: post.publishedLocales,
  };
}

function logFailure(what: string, error: unknown): void {
  console.error(`[blog] ${what} failed:`, error instanceof Error ? error.message : error);
}

/** Every published translation in both languages, newest first. */
export async function listPublished(): Promise<PublishedList> {
  await connection();
  if (!isDatabaseConfigured()) return { status: "unavailable", items: [] };
  try {
    return { status: "ok", items: await cachedPublishedList() };
  } catch (error) {
    unstable_rethrow(error);
    logFailure("listing published posts", error);
    return { status: "unavailable", items: [] };
  }
}

export async function getPublishedPost(slug: string, locale: Locale): Promise<PublicPost | null> {
  await connection();
  // Anything that cannot be a slug is a 404 without a query or a cache entry.
  if (slug.length > SLUG_MAX_LENGTH || !SLUG_PATTERN.test(slug)) return null;
  if (!isDatabaseConfigured()) return null;
  try {
    return await cachedPublishedPost(slug, locale);
  } catch (error) {
    unstable_rethrow(error);
    logFailure(`reading post "${slug}"`, error);
    return null;
  }
}
