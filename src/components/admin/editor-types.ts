import type { Locale } from "@/i18n/config";
import type { TranslationState } from "@/lib/blog/seo-checks";

/** What the editor needs about one language of a post (plain, serializable data). */
export interface EditorTranslation {
  title: string;
  description: string;
  body: string;
  status: TranslationState;
  publishedAt: string | null;
}

export interface EditorPost {
  /** null for a post that has not been saved yet. */
  id: string | null;
  slug: string;
  translations: Record<Locale, EditorTranslation>;
}

export type EditorFields = Record<Locale, Pick<EditorTranslation, "title" | "description" | "body">>;

export const LANGUAGE_NAME: Record<Locale, string> = { fa: "Persian", en: "English" };
