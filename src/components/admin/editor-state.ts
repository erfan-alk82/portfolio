import { locales, type Locale } from "@/i18n/config";
import type { TranslationState } from "@/lib/blog/seo-checks";
import type { EditorFields, EditorPost } from "./editor-types";

/** Pure editor logic, kept apart from the components so it can be unit-tested. */

export function fieldsOf(post: EditorPost): EditorFields {
  return Object.fromEntries(
    locales.map((locale) => {
      const { title, description, body } = post.translations[locale];
      return [locale, { title, description, body }];
    }),
  ) as EditorFields;
}

/**
 * Unsaved changes, compared the way the server stores them: slug, title and
 * description are trimmed on save, so surrounding whitespace is not a change
 * (otherwise a save would leave the form "unsaved" and publishing blocked).
 * The body is stored exactly as written.
 */
export function isDirty(post: EditorPost, slug: string, fields: EditorFields): boolean {
  if (slug.trim() !== post.slug) return true;
  const saved = fieldsOf(post);
  return locales.some(
    (locale) =>
      fields[locale].title.trim() !== saved[locale].title.trim() ||
      fields[locale].description.trim() !== saved[locale].description.trim() ||
      fields[locale].body !== saved[locale].body,
  );
}

/** Renaming a post with a published language breaks its public URL (there are no redirects). */
export function publishedSlugChange(post: EditorPost, slug: string): boolean {
  if (!post.id || slug.trim() === post.slug) return false;
  return locales.some((locale) => post.translations[locale].status === "published");
}

/** How the other language looks to the SEO checklist while editing. */
export function liveTranslationState(fields: EditorFields[Locale], saved: TranslationState): TranslationState {
  if (saved === "published") return "published";
  return fields.title.trim() || fields.body.trim() ? "draft" : "missing";
}

interface PublishContext {
  postId: string | null;
  saved: TranslationState;
  dirty: boolean;
  blocking: boolean;
}

/** Why "Publish" is unavailable right now, or null when it may be used. */
export function publishBlockedReason({ postId, saved, dirty, blocking }: PublishContext): string | null {
  if (!postId) return "Create the draft first.";
  if (saved === "missing") return "Write and save this language first.";
  if (dirty) return "Save your changes before publishing.";
  if (blocking) return "Fix the errors in the checklist first.";
  return null;
}
