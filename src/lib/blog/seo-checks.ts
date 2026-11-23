import type { Locale } from "@/i18n/config";
import { plainText } from "@/lib/rich";
import { SLUG_PATTERN } from "./schemas";

/**
 * The SEO checklist shown next to each translation in the editor. Errors block
 * publishing (enforced again on the server in publishTranslation); warnings
 * are advice. Ranges follow what search results typically show in full.
 */

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

const LANGUAGE_NAME: Record<Locale, string> = { fa: "Persian", en: "English" };

function within(length: number, range: { min: number; max: number }): boolean {
  return length >= range.min && length <= range.max;
}

export function checkTranslationSeo(input: SeoInput): SeoCheck[] {
  const title = plainText(input.title.trim());
  const description = input.description.trim();
  const other: Locale = input.locale === "fa" ? "en" : "fa";

  return [
    {
      id: "slug",
      severity: "error",
      passed: SLUG_PATTERN.test(input.slug),
      message: "Slug uses lowercase letters, digits and single hyphens.",
    },
    {
      id: "title-present",
      severity: "error",
      passed: title.length > 0,
      message: "Title is filled in.",
    },
    {
      id: "title-length",
      severity: "warning",
      passed: within(title.length, TITLE_RANGE),
      message: `Title is ${TITLE_RANGE.min}–${TITLE_RANGE.max} characters (now ${title.length}), so search results show it in full.`,
    },
    {
      id: "description-present",
      severity: "error",
      passed: description.length > 0,
      message: "Meta description is filled in.",
    },
    {
      id: "description-length",
      severity: "warning",
      passed: within(description.length, DESCRIPTION_RANGE),
      message: `Description is ${DESCRIPTION_RANGE.min}–${DESCRIPTION_RANGE.max} characters (now ${description.length}).`,
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
          ? `The ${LANGUAGE_NAME[other]} version is published, so both pages link to each other (hreflang).`
          : `The ${LANGUAGE_NAME[other]} version is ${input.otherTranslation === "draft" ? "still a draft" : "missing"}; this page will be listed in one language only.`,
    },
  ];
}

export function hasBlockingIssue(checks: readonly SeoCheck[]): boolean {
  return checks.some((check) => !check.passed && check.severity === "error");
}
