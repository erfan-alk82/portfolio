import { describe, expect, test } from "vitest";
import type { PostInput } from "@/lib/blog/schemas";
import {
  PublishedTranslationRemovalError,
  type PostRecord,
  SlugTakenError,
  createPost,
  deletePost,
  findPublishedPost,
  getPostById,
  listPostsForAdmin,
  listPublishedTranslations,
  setTranslationStatus,
  updatePost,
} from "@/server/blog/repository";

const fa = { title: "یادداشت‌هایی درباره‌ی معماری", description: "توضیح کوتاه", bodyMd: "# متن" };
const en = { title: "Notes on architecture", description: "Short description", bodyMd: "# Body" };

function input(slug: string, translations: PostInput["translations"]): PostInput {
  return { slug, translations };
}

async function update(id: string, value: PostInput): Promise<{ post: PostRecord; previousSlug: string }> {
  const result = await updatePost(id, value);
  if (!result) throw new Error(`post ${id} vanished`);
  return result;
}

describe("blog repository", () => {
  test("creates a post with one translation as a draft", async () => {
    const post = await createPost(input("first", { fa }));
    expect(post.slug).toBe("first");
    expect(post.translations).toHaveLength(1);
    expect(post.translations[0]).toMatchObject({ locale: "fa", status: "draft", publishedAt: null, ...fa });
    expect(await getPostById(post.id)).toEqual(post);
  });

  test("an unknown id reads as null", async () => {
    expect(await getPostById("0b6f4c1e-8a59-4c1b-9a43-3f0d8c1a2b3c")).toBeNull();
    expect(await updatePost("0b6f4c1e-8a59-4c1b-9a43-3f0d8c1a2b3c", input("x", { en }))).toBeNull();
  });

  test("a taken slug is reported as SlugTakenError", async () => {
    await createPost(input("taken", { en }));
    await expect(createPost(input("taken", { fa }))).rejects.toBeInstanceOf(SlugTakenError);
    const other = await createPost(input("other", { fa }));
    await expect(updatePost(other.id, input("taken", { fa }))).rejects.toBeInstanceOf(SlugTakenError);
  });

  test("updating adds a translation, renames the slug and reports the old one", async () => {
    const post = await createPost(input("old-slug", { fa }));
    const { post: updated, previousSlug } = await update(post.id, input("new-slug", { fa, en }));
    expect(previousSlug).toBe("old-slug");
    expect(updated.slug).toBe("new-slug");
    expect(updated.translations.map((t) => t.locale).sort()).toEqual(["en", "fa"]);
  });

  test("saving unchanged content keeps the translation's modified time", async () => {
    const post = await createPost(input("stable", { en }));
    const before = post.translations[0].updatedAt;
    const { post: after } = await update(post.id, input("stable", { en }));
    expect(after.translations[0].updatedAt).toEqual(before);
    const { post: edited } = await update(post.id, input("stable", { en: { ...en, bodyMd: "changed" } }));
    expect(edited.translations[0].updatedAt.getTime()).toBeGreaterThan(before.getTime());
  });

  test("a draft translation left empty is removed; a published one is protected", async () => {
    const post = await createPost(input("removal", { fa, en }));
    const { post: withoutEn } = await update(post.id, input("removal", { fa }));
    expect(withoutEn.translations.map((t) => t.locale)).toEqual(["fa"]);

    await setTranslationStatus(post.id, "fa", "published");
    await expect(updatePost(post.id, input("removal", { en }))).rejects.toBeInstanceOf(PublishedTranslationRemovalError);
  });

  test("publishing sets the date once; unpublishing and republishing keep it", async () => {
    const post = await createPost(input("dates", { en }));
    const published = await setTranslationStatus(post.id, "en", "published");
    expect(published).toEqual({ slug: "dates" });
    const first = (await getPostById(post.id))!.translations[0];
    expect(first.status).toBe("published");
    expect(first.publishedAt).toBeInstanceOf(Date);

    await setTranslationStatus(post.id, "en", "draft");
    expect((await getPostById(post.id))!.translations[0]).toMatchObject({ status: "draft", publishedAt: first.publishedAt });

    await setTranslationStatus(post.id, "en", "published");
    expect((await getPostById(post.id))!.translations[0].publishedAt).toEqual(first.publishedAt);
  });

  test("status changes on a missing translation return null", async () => {
    const post = await createPost(input("missing", { fa }));
    expect(await setTranslationStatus(post.id, "en", "published")).toBeNull();
  });

  test("public reads only ever see published translations", async () => {
    const both = await createPost(input("both", { fa, en }));
    const draft = await createPost(input("draft-only", { fa, en }));
    await setTranslationStatus(both.id, "fa", "published");
    await setTranslationStatus(both.id, "en", "published");
    const faOnly = await createPost(input("fa-only", { fa, en }));
    await setTranslationStatus(faOnly.id, "fa", "published");

    const listed = await listPublishedTranslations();
    expect(listed.map((row) => `${row.slug}/${row.locale}`).sort()).toEqual(["both/en", "both/fa", "fa-only/fa"]);
    expect(listed.every((row) => row.publishedAt instanceof Date)).toBe(true);

    expect(await findPublishedPost("draft-only", "fa")).toBeNull();
    expect(await findPublishedPost("fa-only", "en")).toBeNull();
    const found = await findPublishedPost("fa-only", "fa");
    expect(found).toMatchObject({ slug: "fa-only", locale: "fa", title: fa.title, bodyMd: fa.bodyMd, publishedLocales: ["fa"] });
    expect((await findPublishedPost("both", "en"))?.publishedLocales).toEqual(["fa", "en"]);
    expect(draft.id).toBeTruthy();
  });

  test("published posts are listed newest first", async () => {
    const older = await createPost(input("older", { en }));
    await setTranslationStatus(older.id, "en", "published");
    const newer = await createPost(input("newer", { en }));
    await setTranslationStatus(newer.id, "en", "published");
    expect((await listPublishedTranslations()).map((row) => row.slug)).toEqual(["newer", "older"]);
  });

  test("the admin list summarises every post, most recently edited first", async () => {
    const a = await createPost(input("a", { fa }));
    await createPost(input("b", { en }));
    await update(a.id, input("a", { fa: { ...fa, title: "عنوان تازه" } }));
    const list = await listPostsForAdmin();
    expect(list.map((p) => p.slug)).toEqual(["a", "b"]);
    expect(list[0].translations[0]).toMatchObject({ locale: "fa", title: "عنوان تازه", status: "draft" });
  });

  test("deleting returns the slug, and deleting twice returns null", async () => {
    const post = await createPost(input("gone", { fa }));
    expect(await deletePost(post.id)).toEqual({ slug: "gone" });
    expect(await deletePost(post.id)).toBeNull();
    expect(await getPostById(post.id)).toBeNull();
  });
});
