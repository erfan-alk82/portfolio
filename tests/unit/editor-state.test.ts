import { describe, expect, test } from "vitest";
import {
  fieldsOf,
  isDirty,
  liveTranslationState,
  publishBlockedReason,
  publishedSlugChange,
} from "@/components/admin/editor-state";
import type { EditorPost } from "@/components/admin/editor-types";

const post: EditorPost = {
  id: "0b6f4c1e-8a59-4c1b-9a43-3f0d8c1a2b3c",
  slug: "notes",
  translations: {
    fa: { title: "عنوان", description: "توضیح", body: "متن\n", status: "published", publishedAt: "2026-11-01T00:00:00.000Z" },
    en: { title: "", description: "", body: "", status: "missing", publishedAt: null },
  },
};

describe("isDirty", () => {
  test("an untouched form is clean", () => {
    expect(isDirty(post, post.slug, fieldsOf(post))).toBe(false);
  });

  test("whitespace the server trims away does not count as a change", () => {
    const fields = fieldsOf(post);
    const padded = { ...fields, fa: { ...fields.fa, title: "  عنوان ", description: "توضیح  " } };
    expect(isDirty(post, " notes ", padded)).toBe(false);
  });

  test("a real edit in any field is a change", () => {
    const fields = fieldsOf(post);
    expect(isDirty(post, "notes-2", fields)).toBe(true);
    expect(isDirty(post, post.slug, { ...fields, en: { ...fields.en, title: "New" } })).toBe(true);
    expect(isDirty(post, post.slug, { ...fields, fa: { ...fields.fa, body: "متن تازه\n" } })).toBe(true);
  });

  test("the body is compared exactly, because the server keeps it as written", () => {
    const fields = fieldsOf(post);
    expect(isDirty(post, post.slug, { ...fields, fa: { ...fields.fa, body: "متن" } })).toBe(true);
  });
});

describe("publishedSlugChange", () => {
  test("warns when a published post's slug changes", () => {
    expect(publishedSlugChange(post, "renamed")).toBe(true);
  });

  test("stays quiet for unchanged slugs, new posts and unpublished posts", () => {
    expect(publishedSlugChange(post, " notes ")).toBe(false);
    expect(publishedSlugChange({ ...post, id: null }, "renamed")).toBe(false);
    const draft: EditorPost = { ...post, translations: { ...post.translations, fa: { ...post.translations.fa, status: "draft" } } };
    expect(publishedSlugChange(draft, "renamed")).toBe(false);
  });
});

describe("liveTranslationState", () => {
  test("published stays published; otherwise content decides draft or missing", () => {
    expect(liveTranslationState({ title: "", description: "", body: "" }, "published")).toBe("published");
    expect(liveTranslationState({ title: "T", description: "", body: "" }, "missing")).toBe("draft");
    expect(liveTranslationState({ title: " ", description: "x", body: " " }, "draft")).toBe("missing");
  });
});

describe("publishBlockedReason", () => {
  const ready = { postId: "id", saved: "draft" as const, dirty: false, blocking: false };

  test("allows publishing a saved, clean, error-free draft", () => {
    expect(publishBlockedReason(ready)).toBeNull();
  });

  test.each([
    [{ postId: null }, /Create the draft/],
    [{ saved: "missing" as const }, /Write and save/],
    [{ dirty: true }, /Save your changes/],
    [{ blocking: true }, /Fix the errors/],
  ])("explains why it is blocked: %o", (patch, message) => {
    expect(publishBlockedReason({ ...ready, ...patch })).toMatch(message);
  });
});
