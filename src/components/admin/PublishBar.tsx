"use client";

import { LANGUAGE_NAME_EN, type Locale } from "@/i18n/config";
import type { TranslationState } from "@/lib/blog/seo-checks";
import { SubmitButton } from "./FormControls";

type Props = {
  locale: Locale;
  postId: string | null;
  saved: TranslationState;
  blockedReason: string | null;
  pending: boolean;
};

/** Publish / unpublish one language. The buttons submit the editor form with their own intent. */
export function PublishBar({ locale, postId, saved, blockedReason, pending }: Props) {
  const language = LANGUAGE_NAME_EN[locale];
  const hintId = `${locale}-publish-hint`;
  const showHint = blockedReason !== null && saved !== "published";
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-4">
      {saved === "published" ? (
        <SubmitButton name="intent" value={`unpublish:${locale}`} className="admin-button" unavailable={pending}>
          Unpublish {language}
        </SubmitButton>
      ) : (
        <SubmitButton
          name="intent"
          value={`publish:${locale}`}
          className="admin-button-primary"
          unavailable={pending || blockedReason !== null}
          describedBy={showHint ? hintId : undefined}
        >
          Publish {language}
        </SubmitButton>
      )}
      {postId && saved !== "missing" ? (
        <a href={`/admin/posts/${postId}/preview/${locale}`} className="admin-button" target="_blank" rel="noopener">
          Preview saved version
        </a>
      ) : null}
      {showHint ? (
        <p id={hintId} className="text-sm text-ink-soft">
          {blockedReason}
        </p>
      ) : null}
    </div>
  );
}
