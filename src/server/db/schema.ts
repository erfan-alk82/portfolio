/**
 * Database schema (PostgreSQL). Migrations in drizzle/ are generated from this
 * file with `npm run db:generate` and committed; never edit applied ones.
 *
 * No "server-only" import here: drizzle-kit loads this file outside Next.js.
 * It holds table definitions only, no data access.
 */
import { sql } from "drizzle-orm";
import {
  check,
  customType,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

/** One row per article. The ASCII slug is shared by its Persian and English versions. */
export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique("posts_slug_unique"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("posts_slug_format", sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check("posts_slug_length", sql`char_length(${table.slug}) <= 80`),
  ],
);

/** A post in one language. Publishing is per translation. */
export const postTranslations = pgTable(
  "post_translations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    locale: text("locale", { enum: ["fa", "en"] }).notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    bodyMd: text("body_md").notNull().default(""),
    status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
    /** Set on the first publish and kept through unpublish/republish, so the date is stable. */
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("post_translations_post_locale_unique").on(table.postId, table.locale),
    check("post_translations_locale", sql`${table.locale} in ('fa', 'en')`),
    check("post_translations_title_length", sql`char_length(${table.title}) between 1 and 120`),
    check("post_translations_description_length", sql`char_length(${table.description}) <= 200`),
    check("post_translations_body_length", sql`char_length(${table.bodyMd}) <= 200000`),
    check("post_translations_status", sql`${table.status} in ('draft', 'published')`),
    check(
      "post_translations_published_has_date",
      sql`${table.status} <> 'published' or ${table.publishedAt} is not null`,
    ),
    index("post_translations_published_idx")
      .on(table.locale, table.publishedAt.desc())
      .where(sql`${table.status} = 'published'`),
  ],
);

/** Admin sessions. Only SHA-256 of the cookie token is stored. */
export const adminSessions = pgTable(
  "admin_sessions",
  {
    idHash: bytea("id_hash").primaryKey(),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent"),
  },
  (table) => [index("admin_sessions_expires_idx").on(table.expiresAt)],
);

/** Failed-login counters: one row per hashed IP, plus one global row. */
export const authThrottle = pgTable("auth_throttle", {
  key: text("key").primaryKey(),
  failures: integer("failures").notNull().default(0),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull().defaultNow(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
});
