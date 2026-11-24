import { getCopy } from "@/content";
import { LANGUAGE_NAME_EN, type Locale } from "@/i18n/config";
import { plainText } from "@/lib/rich";
import { displayLength } from "@/lib/text";
import { isValidSlug } from "./slug";

/**
 * The SEO checklist shown next to each translation in the editor. Errors block
 * publishing (enforced again on the server in publishTranslation); warnings
 * are advice. Ranges follow what search results typically show in full, and
 * lengths are measured as readers see them (see displayLength).
 */

/** Applies to the whole <title>: the post title plus " | site name". */
export const TITLE_RANGE = { min: 30, max: 60 } as const;
export const DESCRIPTION_RANGE = { min: 70, max: 160 } as const;

export type SeoSeverity = "error" | "warning";
export type TranslationState = "missing" | "draft" | "published";
export type SeoCheckId =
  | "slug"
  | "title-present"
  | "title-length"
  | "description-present"
  | "description-length"
  | "body"
  | "other-translation";

export interface SeoCheck {
  id: SeoCheckId;
  severity: SeoSeverity;
  passed: boolean;
  message: string;
}

export interface SeoInput {
  slug: string;
  locale: Locale;
  title: string;
  description: string;
  bodyMd: string;
  /** State of the same post in the other language, which decides its hreflang pair. */
  otherTranslation: TranslationState;
}

/** The <title> exactly as buildPostMetadata renders it. */
export function titleTag(locale: Locale, title: string): string {
  return `${plainText(title.trim())} | ${getCopy(locale).meta.siteName}`;
}

function within(length: number, range: { min: number; max: number }): boolean {
  return length >= range.min && length <= range.max;
}

export function checkTranslationSeo(input: SeoInput): SeoCheck[] {
  const title = plainText(input.title.trim());
  const titleLength = displayLength(titleTag(input.locale, input.title));
  const descriptionLength = displayLength(input.description);
  const other: Locale = input.locale === "fa" ? "en" : "fa";

  return [
    {
      id: "slug",
      severity: "error",
      passed: isValidSlug(input.slug),
      message: "Slug uses lowercase letters, digits and single hyphens.",
    },
    {
      id: "title-present",
      severity: "error",
      passed: displayLength(title) > 0,
      message: "Title is filled in.",
    },
    {
      id: "title-length",
      severity: "warning",
      passed: within(titleLength, TITLE_RANGE),
      message: `The full page title (with " | site name") is ${TITLE_RANGE.min}–${TITLE_RANGE.max} characters (now ${titleLength}), so search results show it in full.`,
    },
    {
      id: "description-present",
      severity: "error",
      passed: descriptionLength > 0,
      message: "Meta description is filled in.",
    },
    {
      id: "description-length",
      severity: "warning",
      passed: within(descriptionLength, DESCRIPTION_RANGE),
      message: `Description is ${DESCRIPTION_RANGE.min}–${DESCRIPTION_RANGE.max} characters (now ${descriptionLength}).`,
    },
    {
      id: "body",
      severity: "error",
      passed: input.bodyMd.trim().length > 0,
      message: "Body has content.",
    },
    {
      id: "other-translation",
      severity: "warning",
      passed: input.otherTranslation === "published",
      message:
        input.otherTranslation === "published"
          ? `The ${LANGUAGE_NAME_EN[other]} version is published, so both pages link to each other (hreflang).`
          : `The ${LANGUAGE_NAME_EN[other]} version is ${input.otherTranslation === "draft" ? "still a draft" : "missing"}; this page will be listed in one language only.`,
    },
  ];
}

export function hasBlockingIssue(checks: readonly SeoCheck[]): boolean {
  return checks.some((check) => !check.passed && check.severity === "error");
}
