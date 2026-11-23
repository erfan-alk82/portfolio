import { describe, expect, test } from "vitest";
import {
  BODY_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  SLUG_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  loginSchema,
  parsePostForm,
  postIdSchema,
  slugSchema,
  translationActionSchema,
} from "@/lib/blog/schemas";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const validFa = {
  "fa.title": "معماری رویدادمحور در عمل",
  "fa.description": "یادداشتی کوتاه",
  "fa.body": "# سلام",
};

describe("slugSchema", () => {
  test.each(["a", "event-driven", "net-10-notes", "x".repeat(SLUG_MAX_LENGTH)])("accepts %s", (slug) => {
    expect(slugSchema.safeParse(slug).success).toBe(true);
  });

  test.each([
    "",
    "Upper",
    "-leading",
    "trailing-",
    "double--dash",
    "space here",
    "فارسی",
    "under_score",
    "x".repeat(SLUG_MAX_LENGTH + 1),
  ])("rejects %j", (slug) => {
    expect(slugSchema.safeParse(slug).success).toBe(false);
  });

  test("trims surrounding whitespace", () => {
    expect(slugSchema.parse("  hello-world ")).toBe("hello-world");
  });
});

describe("parsePostForm", () => {
  test("keeps only translations that have content", () => {
    const result = parsePostForm(form({ slug: "hello", ...validFa, "en.title": "", "en.description": "", "en.body": "" }));
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.slug).toBe("hello");
    expect(result.data.translations.fa?.title).toBe(validFa["fa.title"]);
    expect(result.data.translations.en).toBeUndefined();
  });

  test("normalises Windows line endings in the body", () => {
    const result = parsePostForm(form({ slug: "hello", ...validFa, "fa.body": "a\r\nb" }));
    expect(result.success && result.data.translations.fa?.bodyMd).toBe("a\nb");
  });

  test("requires at least one translation", () => {
    const result = parsePostForm(form({ slug: "hello" }));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.translations).toBeTruthy();
  });

  test("requires a title when a translation has other content", () => {
    const result = parsePostForm(form({ slug: "hello", "en.body": "text" }));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors["en.title"]).toBeTruthy();
  });

  test("reports field errors by path", () => {
    const result = parsePostForm(
      form({
        slug: "Bad Slug",
        "fa.title": "x".repeat(TITLE_MAX_LENGTH + 1),
        "fa.description": "d".repeat(DESCRIPTION_MAX_LENGTH + 1),
        "fa.body": "b".repeat(BODY_MAX_LENGTH + 1),
      }),
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(Object.keys(result.errors).sort()).toEqual(["fa.bodyMd", "fa.description", "fa.title", "slug"]);
  });

  test("ignores unknown locales and non-string values", () => {
    const data = form({ slug: "hello", ...validFa, "de.title": "Hallo" });
    data.set("en.title", new Blob(["x"]));
    const result = parsePostForm(data);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(Object.keys(result.data.translations)).toEqual(["fa"]);
  });
});

describe("other schemas", () => {
  test("postIdSchema accepts only UUIDs", () => {
    expect(postIdSchema.safeParse("0b6f4c1e-8a59-4c1b-9a43-3f0d8c1a2b3c").success).toBe(true);
    expect(postIdSchema.safeParse("1; drop table posts").success).toBe(false);
  });

  test("translationActionSchema checks the locale", () => {
    const id = "0b6f4c1e-8a59-4c1b-9a43-3f0d8c1a2b3c";
    expect(translationActionSchema.safeParse({ id, locale: "fa" }).success).toBe(true);
    expect(translationActionSchema.safeParse({ id, locale: "de" }).success).toBe(false);
  });

  test("loginSchema bounds both fields", () => {
    expect(loginSchema.safeParse({ username: "admin", password: "secret" }).success).toBe(true);
    expect(loginSchema.safeParse({ username: "", password: "secret" }).success).toBe(false);
    expect(loginSchema.safeParse({ username: "admin", password: "p".repeat(1025) }).success).toBe(false);
  });
});
