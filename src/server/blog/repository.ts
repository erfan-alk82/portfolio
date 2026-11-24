import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { locales, type Locale } from "@/i18n/config";
import type { PostInput, TranslationInput } from "@/lib/blog/schemas";
import { getDb, type Database } from "../db/client";
import { postTranslations, posts } from "../db/schema";

/**
 * All blog SQL lives here. It does no authorization: admin callers go through
 * admin-queries.ts / Server Actions (which check the session first), public
 * callers through queries.ts (which only reads published rows).
 */

export type TranslationStatus = "draft" | "published";

export interface TranslationRecord {
  id: string;
  locale: Locale;
  title: string;
  description: string;
  bodyMd: string;
  status: TranslationStatus;
  publishedAt: Date | null;
  updatedAt: Date;
}

export interface PostRecord {
  id: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  /** Ordered fa, en. */
  translations: TranslationRecord[];
}

export interface AdminPostSummary {
  id: string;
  slug: string;
  updatedAt: Date;
  translations: Pick<TranslationRecord, "locale" | "title" | "status" | "publishedAt">[];
}

export interface PublishedSummary {
  slug: string;
  locale: Locale;
  title: string;
  description: string;
  publishedAt: Date;
  updatedAt: Date;
}

export interface PublishedPostRecord extends PublishedSummary {
  bodyMd: string;
  publishedLocales: Locale[];
}

export class SlugTakenError extends Error {
  constructor(slug: string) {
    super(`The slug "${slug}" is already used by another post`);
    this.name = "SlugTakenError";
  }
}

export class PublishedTranslationRemovalError extends Error {
  constructor(public readonly locale: Locale) {
    super(`The ${locale} translation is published; unpublish it before removing its content`);
    this.name = "PublishedTranslationRemovalError";
  }
}

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Executor = Database | Transaction;

const localeOrder = (locale: Locale): number => locales.indexOf(locale);

/** PostgreSQL unique_violation on the slug, however drizzle wraps it. */
function isSlugConflict(error: unknown): boolean {
  const candidates = [error, (error as { cause?: unknown })?.cause];
  return candidates.some(
    (candidate) =>
      (candidate as { code?: string })?.code === "23505" &&
      (candidate as { constraint_name?: string })?.constraint_name === "posts_slug_unique",
  );
}

async function loadTranslations(executor: Executor, postId: string): Promise<TranslationRecord[]> {
  const rows = await executor
    .select({
      id: postTranslations.id,
      locale: postTranslations.locale,
      title: postTranslations.title,
      description: postTranslations.description,
      bodyMd: postTranslations.bodyMd,
      status: postTranslations.status,
      publishedAt: postTranslations.publishedAt,
      updatedAt: postTranslations.updatedAt,
    })
    .from(postTranslations)
    .where(eq(postTranslations.postId, postId));
  return rows.sort((a, b) => localeOrder(a.locale) - localeOrder(b.locale));
}

async function loadPost(executor: Executor, id: string): Promise<PostRecord | null> {
  const [post] = await executor.select().from(posts).where(eq(posts.id, id));
  if (!post) return null;
  return { ...post, translations: await loadTranslations(executor, id) };
}

function sameContent(existing: TranslationRecord, next: TranslationInput): boolean {
  return existing.title === next.title && existing.description === next.description && existing.bodyMd === next.bodyMd;
}

/** Inserts, updates (only when the content changed) or removes each language. */
async function syncTranslations(tx: Transaction, postId: string, input: PostInput): Promise<void> {
  const existing = await loadTranslations(tx, postId);
  for (const locale of locales) {
    const next = input.translations[locale];
    const current = existing.find((t) => t.locale === locale);
    if (next && !current) {
      await tx.insert(postTranslations).values({ postId, locale, ...next });
    } else if (next && current && !sameContent(current, next)) {
      await tx
        .update(postTranslations)
        .set({ ...next, updatedAt: sql`now()` })
        .where(eq(postTranslations.id, current.id));
    } else if (!next && current) {
      if (current.status === "published") throw new PublishedTranslationRemovalError(locale);
      await tx.delete(postTranslations).where(eq(postTranslations.id, current.id));
    }
  }
}

export async function createPost(input: PostInput): Promise<PostRecord> {
  try {
    return await getDb().transaction(async (tx) => {
      const [post] = await tx.insert(posts).values({ slug: input.slug }).returning({ id: posts.id });
      await syncTranslations(tx, post.id, input);
      return (await loadPost(tx, post.id))!;
    });
  } catch (error) {
    if (isSlugConflict(error)) throw new SlugTakenError(input.slug);
    throw error;
  }
}

/** Returns the updated post and the slug it had before, so callers can expire both cache tags. */
export async function updatePost(id: string, input: PostInput): Promise<{ post: PostRecord; previousSlug: string } | null> {
  try {
    return await getDb().transaction(async (tx) => {
      const [current] = await tx.select({ slug: posts.slug }).from(posts).where(eq(posts.id, id)).for("update");
      if (!current) return null;
      await tx.update(posts).set({ slug: input.slug, updatedAt: sql`now()` }).where(eq(posts.id, id));
      await syncTranslations(tx, id, input);
      return { post: (await loadPost(tx, id))!, previousSlug: current.slug };
    });
  } catch (error) {
    if (isSlugConflict(error)) throw new SlugTakenError(input.slug);
    throw error;
  }
}

export async function getPostById(id: string): Promise<PostRecord | null> {
  return loadPost(getDb(), id);
}

export async function listPostsForAdmin(): Promise<AdminPostSummary[]> {
  const db = getDb();
  const postRows = await db
    .select({ id: posts.id, slug: posts.slug, updatedAt: posts.updatedAt })
    .from(posts)
    .orderBy(desc(posts.updatedAt), asc(posts.slug));
  if (postRows.length === 0) return [];
  const translationRows = await db
    .select({
      postId: postTranslations.postId,
      locale: postTranslations.locale,
      title: postTranslations.title,
      status: postTranslations.status,
      publishedAt: postTranslations.publishedAt,
    })
    .from(postTranslations)
    .where(inArray(postTranslations.postId, postRows.map((p) => p.id)));
  return postRows.map((post) => ({
    ...post,
    translations: translationRows
      .filter((t) => t.postId === post.id)
      .sort((a, b) => localeOrder(a.locale) - localeOrder(b.locale))
      .map(({ postId, ...rest }) => rest),
  }));
}

/**
 * Publishing stamps published_at on the first publish only, so unpublishing
 * and republishing keep the original date. Returns null when that language
 * does not exist for the post.
 */
export async function setTranslationStatus(
  id: string,
  locale: Locale,
  status: TranslationStatus,
): Promise<{ slug: string } | null> {
  const db = getDb();
  const updated = await db
    .update(postTranslations)
    .set(
      status === "published"
        ? { status, publishedAt: sql`coalesce(${postTranslations.publishedAt}, now())` }
        : { status },
    )
    .where(and(eq(postTranslations.postId, id), eq(postTranslations.locale, locale)))
    .returning({ postId: postTranslations.postId });
  if (updated.length === 0) return null;
  const [post] = await db.select({ slug: posts.slug }).from(posts).where(eq(posts.id, id));
  return post ? { slug: post.slug } : null;
}

export async function deletePost(id: string): Promise<{ slug: string } | null> {
  const [deleted] = await getDb().delete(posts).where(eq(posts.id, id)).returning({ slug: posts.slug });
  return deleted ?? null;
}

const publishedColumns = {
  slug: posts.slug,
  locale: postTranslations.locale,
  title: postTranslations.title,
  description: postTranslations.description,
  publishedAt: postTranslations.publishedAt,
  updatedAt: postTranslations.updatedAt,
};

function asPublished<T extends { publishedAt: Date | null }>(row: T): T & { publishedAt: Date } {
  // The CHECK constraint guarantees a date on published rows.
  return row as T & { publishedAt: Date };
}

/** Every published translation in both languages, newest first. */
export async function listPublishedTranslations(): Promise<PublishedSummary[]> {
  const rows = await getDb()
    .select(publishedColumns)
    .from(postTranslations)
    .innerJoin(posts, eq(posts.id, postTranslations.postId))
    .where(eq(postTranslations.status, "published"))
    .orderBy(desc(postTranslations.publishedAt), asc(posts.slug));
  return rows.map(asPublished);
}

export async function findPublishedPost(slug: string, locale: Locale): Promise<PublishedPostRecord | null> {
  const db = getDb();
  const rows = await db
    .select({ ...publishedColumns, bodyMd: postTranslations.bodyMd, postId: posts.id })
    .from(postTranslations)
    .innerJoin(posts, eq(posts.id, postTranslations.postId))
    .where(and(eq(posts.slug, slug), eq(postTranslations.locale, locale), eq(postTranslations.status, "published")));
  const [row] = rows;
  if (!row) return null;
  const languages = await db
    .select({ locale: postTranslations.locale })
    .from(postTranslations)
    .where(and(eq(postTranslations.postId, row.postId), eq(postTranslations.status, "published")));
  const { postId, ...post } = asPublished(row);
  return {
    ...post,
    publishedLocales: languages.map((l) => l.locale).sort((a, b) => localeOrder(a) - localeOrder(b)),
  };
}
