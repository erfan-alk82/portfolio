import { describe, expect, test } from "vitest";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";

async function insertPost(slug: string): Promise<string> {
  const rows = await getDb().execute<{ id: string }>(sql`insert into posts (slug) values (${slug}) returning id`);
  return rows[0].id;
}

/** drizzle wraps driver errors; the PostgreSQL error (with its constraint name) is the cause. */
async function constraintOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (error) {
    const cause = (error as { cause?: { constraint_name?: string } }).cause;
    return cause?.constraint_name ?? (error as { constraint_name?: string }).constraint_name;
  }
  throw new Error("expected the statement to fail");
}

describe("database constraints", () => {
  test.each([
    ["Upper", "posts_slug_format"],
    ["two--dashes", "posts_slug_format"],
    ["a".repeat(81), "posts_slug_length"],
  ])("rejects slug %j", async (slug, constraint) => {
    await expect(constraintOf(insertPost(slug))).resolves.toBe(constraint);
  });

  test("slugs are unique", async () => {
    await insertPost("same");
    await expect(constraintOf(insertPost("same"))).resolves.toBe("posts_slug_unique");
  });

  test("one translation per post and locale", async () => {
    const id = await insertPost("one");
    const db = getDb();
    await db.execute(sql`insert into post_translations (post_id, locale, title) values (${id}, 'fa', 'عنوان')`);
    await expect(
      constraintOf(db.execute(sql`insert into post_translations (post_id, locale, title) values (${id}, 'fa', 'دوم')`)),
    ).resolves.toBe("post_translations_post_locale_unique");
  });

  test.each([
    ["locale", sql`'de'`, sql`'title'`, sql`'draft'`, sql`null`, "post_translations_locale"],
    ["empty title", sql`'fa'`, sql`''`, sql`'draft'`, sql`null`, "post_translations_title_length"],
    ["status", sql`'fa'`, sql`'title'`, sql`'live'`, sql`null`, "post_translations_status"],
    ["published without date", sql`'fa'`, sql`'title'`, sql`'published'`, sql`null`, "post_translations_published_has_date"],
  ])("rejects a translation with a bad %s", async (_label, locale, title, status, publishedAt, constraint) => {
    const id = await insertPost("checks");
    await expect(
      constraintOf(
        getDb().execute(
          sql`insert into post_translations (post_id, locale, title, status, published_at) values (${id}, ${locale}, ${title}, ${status}, ${publishedAt})`,
        ),
      ),
    ).resolves.toBe(constraint);
  });

  test("length limits on description and body", async () => {
    const id = await insertPost("limits");
    const db = getDb();
    await expect(
      constraintOf(
        db.execute(sql`insert into post_translations (post_id, locale, title, description) values (${id}, 'en', 't', ${"d".repeat(201)})`),
      ),
    ).resolves.toBe("post_translations_description_length");
    await expect(
      constraintOf(
        db.execute(sql`insert into post_translations (post_id, locale, title, body_md) values (${id}, 'en', 't', ${"b".repeat(200_001)})`),
      ),
    ).resolves.toBe("post_translations_body_length");
  });

  test("deleting a post deletes its translations", async () => {
    const id = await insertPost("cascade");
    const db = getDb();
    await db.execute(sql`insert into post_translations (post_id, locale, title) values (${id}, 'en', 'Title')`);
    await db.execute(sql`delete from posts where id = ${id}`);
    const rows = await db.execute(sql`select 1 from post_translations where post_id = ${id}`);
    expect(rows).toHaveLength(0);
  });
});
