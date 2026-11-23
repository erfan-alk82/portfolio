import { z } from "zod";
import { locales, type Locale } from "@/i18n/config";

/**
 * Validation for everything the admin can send. The same limits are enforced
 * again by CHECK constraints in the database (drizzle/0000_*.sql).
 */

/** One ASCII slug is shared by both languages: lowercase words joined by single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 80;
export const TITLE_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 200;
export const BODY_MAX_LENGTH = 200_000;

export const slugSchema = z
  .string()
  .trim()
  .min(1, "Enter a slug.")
  .max(SLUG_MAX_LENGTH, `Use at most ${SLUG_MAX_LENGTH} characters.`)
  .regex(SLUG_PATTERN, "Use lowercase letters, digits and single hyphens (for example event-driven-notes).");

export const postIdSchema = z.uuid();

export const blogLocaleSchema = z.enum(locales);

export const translationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Enter a title.")
    .max(TITLE_MAX_LENGTH, `Use at most ${TITLE_MAX_LENGTH} characters.`),
  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX_LENGTH, `Use at most ${DESCRIPTION_MAX_LENGTH} characters.`),
  bodyMd: z.string().max(BODY_MAX_LENGTH, `Use at most ${BODY_MAX_LENGTH.toLocaleString("en")} characters.`),
});

export type TranslationInput = z.infer<typeof translationSchema>;

export const postInputSchema = z
  .object({
    slug: slugSchema,
    translations: z.object({
      fa: translationSchema.optional(),
      en: translationSchema.optional(),
    }),
  })
  .refine((value) => Boolean(value.translations.fa || value.translations.en), {
    path: ["translations"],
    message: "Write at least one language.",
  });

export type PostInput = z.infer<typeof postInputSchema>;

export const translationActionSchema = z.object({
  id: postIdSchema,
  locale: blogLocaleSchema,
});

export const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(1024),
});

export type FieldErrors = Record<string, string>;

export type ParseResult<T> = { success: true; data: T } | { success: false; errors: FieldErrors };

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

/** A translation counts as written once any of its fields has content. */
function translationFromForm(form: FormData, locale: Locale): TranslationInput | undefined {
  const title = text(form, `${locale}.title`);
  const description = text(form, `${locale}.description`);
  // Browsers submit textarea line breaks as CRLF; store plain LF.
  const bodyMd = text(form, `${locale}.body`).replace(/\r\n?/g, "\n");
  if (!title.trim() && !description.trim() && !bodyMd.trim()) return undefined;
  return { title, description, bodyMd };
}

/** First message per field path, e.g. { slug: "...", "fa.title": "..." }. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const path = issue.path.filter((part) => part !== "translations").join(".") || "translations";
    errors[path] ??= issue.message;
  }
  return errors;
}

export function parsePostForm(form: FormData): ParseResult<PostInput> {
  const translations: Partial<Record<Locale, TranslationInput>> = {};
  for (const locale of locales) {
    const translation = translationFromForm(form, locale);
    if (translation) translations[locale] = translation;
  }
  const result = postInputSchema.safeParse({ slug: text(form, "slug"), translations });
  return result.success ? { success: true, data: result.data } : { success: false, errors: fieldErrors(result.error) };
}
