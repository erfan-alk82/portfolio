import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import type { Locale } from "@/i18n/config";
import { isValidSlug } from "@/lib/blog/slug";
import type { PublicPost } from "@/lib/blog/seo";
import { isDatabaseConfigured } from "../db/client";
import { findPublishedPost, listPublishedTranslations } from "./repository";
import { POSTS_TAG, postTag } from "./tags";

/**
 * Public, cached blog reads. Each one first waits for a request
 * (connection()), so nothing touches the database at build time, then reads
 * through a remote cache that Server Actions expire with updateTag.
 *
 * Results keep three cases apart: data, "unconfigured" (DATABASE_URL is
 * intentionally unset: there is no blog) and "unavailable" (the database is
 * failing right now). Callers degrade differently for each.
 */

export interface PublishedListItem {
  slug: string;
  locale: Locale;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
}

export type PublishedList =
  | { status: "ok"; items: PublishedListItem[] }
  | { status: "unconfigured"; items: [] }
  | { status: "unavailable"; items: [] };

export type PublishedPostResult =
  | { status: "ok"; post: PublicPost }
  | { status: "missing" }
  | { status: "unavailable" };

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
  cacheTag(POSTS_TAG, postTag(slug));
  const post = await findPublishedPost(slug, locale);
  // Misses are kept briefly (and expire on any save anyway), so guessed URLs do not pile up for long.
  if (post) cacheLife("max");
  else cacheLife("minutes");
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
  if (!isDatabaseConfigured()) return { status: "unconfigured", items: [] };
  try {
    return { status: "ok", items: await cachedPublishedList() };
  } catch (error) {
    unstable_rethrow(error);
    logFailure("listing published posts", error);
    return { status: "unavailable", items: [] };
  }
}

export async function getPublishedPost(slug: string, locale: Locale): Promise<PublishedPostResult> {
  await connection();
  // Anything that cannot be a slug is missing without a query or a cache entry.
  if (!isValidSlug(slug)) return { status: "missing" };
  // No database configured means there is no blog, so every post is simply missing.
  if (!isDatabaseConfigured()) return { status: "missing" };
  try {
    const post = await cachedPublishedPost(slug, locale);
    return post ? { status: "ok", post } : { status: "missing" };
  } catch (error) {
    unstable_rethrow(error);
    logFailure(`reading post "${slug}"`, error);
    return { status: "unavailable" };
  }
}
