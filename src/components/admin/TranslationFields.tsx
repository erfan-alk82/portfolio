"use client";

import { useDeferredValue, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { directionOf, type Locale } from "@/i18n/config";
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH, type FieldErrors } from "@/lib/blog/schemas";
import { DESCRIPTION_RANGE, TITLE_RANGE, type SeoCheck } from "@/lib/blog/seo-checks";
import { plainText } from "@/lib/rich";
import { MarkdownBody } from "@/components/blog/MarkdownBody";
import { SeoChecklist } from "./SeoChecklist";
import { StatusBadge } from "./StatusBadge";
import { LANGUAGE_NAME, type EditorFields, type EditorTranslation } from "./editor-types";

type Props = {
  locale: Locale;
  postId: string | null;
  saved: EditorTranslation;
  fields: EditorFields[Locale];
  onChange: (field: keyof EditorFields[Locale], value: string) => void;
  checks: readonly SeoCheck[];
  errors: FieldErrors | undefined;
  /** Why publishing is unavailable right now, or null when it is allowed. */
  publishBlockedReason: string | null;
  pending: boolean;
};

const NATIVE_NAME: Record<Locale, string> = { fa: "فارسی", en: "English" };

function Counter({ length, range }: { length: number; range: { min: number; max: number } }) {
  const inRange = length >= range.min && length <= range.max;
  return (
    <span className={inRange ? "text-ink-soft" : "text-contour-strong"}>
      {length} characters · aim for {range.min}–{range.max}
    </span>
  );
}

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm font-semibold text-signal-deep">
      {message}
    </p>
  );
}

/** One language of a post: fields, live preview, SEO checklist and publish controls. */
export function TranslationFields(props: Props) {
  const { locale, postId, saved, fields, onChange, checks, errors, publishBlockedReason, pending } = props;
  const [previewOpen, setPreviewOpen] = useState(false);
  const deferredBody = useDeferredValue(fields.body);
  const dir = directionOf(locale);
  const id = (name: string) => `${locale}-${name}`;
  const error = (name: string) => errors?.[`${locale}.${name}`];

  return (
    <fieldset className="flex flex-col gap-5 border-t-2 border-ink pt-6" aria-describedby={id("status")}>
      <legend className="sr-only">{LANGUAGE_NAME[locale]} version</legend>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-ink">
          {LANGUAGE_NAME[locale]}{" "}
          <span lang={locale} className="font-normal text-ink-soft">
            ({NATIVE_NAME[locale]})
          </span>
        </h2>
        <p id={id("status")} className="flex items-center gap-3">
          <StatusBadge status={saved.status} />
          {saved.publishedAt ? (
            <span className="text-sm text-ink-soft">
              first published <time dateTime={saved.publishedAt}>{saved.publishedAt.slice(0, 10)}</time>
            </span>
          ) : null}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={id("title")} className="text-sm font-semibold text-ink">
          Title
        </label>
        <input
          id={id("title")}
          name={`${locale}.title`}
          value={fields.title}
          onChange={(event) => onChange("title", event.target.value)}
          maxLength={TITLE_MAX_LENGTH}
          dir={dir}
          lang={locale}
          aria-invalid={error("title") ? true : undefined}
          aria-describedby={`${id("title-count")} ${error("title") ? id("title-error") : ""}`.trim()}
          className="admin-input text-lg font-semibold"
        />
        <p id={id("title-count")} className="text-xs">
          <Counter length={plainText(fields.title.trim()).length} range={TITLE_RANGE} />
        </p>
        <FieldError id={id("title-error")} message={error("title")} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={id("description")} className="text-sm font-semibold text-ink">
          Meta description
        </label>
        <textarea
          id={id("description")}
          name={`${locale}.description`}
          value={fields.description}
          onChange={(event) => onChange("description", event.target.value)}
          maxLength={DESCRIPTION_MAX_LENGTH}
          rows={2}
          dir={dir}
          lang={locale}
          aria-invalid={error("description") ? true : undefined}
          aria-describedby={`${id("description-count")} ${error("description") ? id("description-error") : ""}`.trim()}
          className="admin-input"
        />
        <p id={id("description-count")} className="text-xs">
          <Counter length={fields.description.trim().length} range={DESCRIPTION_RANGE} />
        </p>
        <FieldError id={id("description-error")} message={error("description")} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <label htmlFor={id("body")} className="text-sm font-semibold text-ink">
            Body <span className="font-normal text-ink-soft">(Markdown; wrap Latin terms as [[term]])</span>
          </label>
          <button
            type="button"
            className="admin-button min-h-9 px-3 text-sm"
            aria-expanded={previewOpen}
            aria-controls={id("preview")}
            onClick={() => setPreviewOpen((open) => !open)}
          >
            {previewOpen ? (
              <EyeOff aria-hidden="true" className="size-4" strokeWidth={1.75} />
            ) : (
              <Eye aria-hidden="true" className="size-4" strokeWidth={1.75} />
            )}
            {previewOpen ? "Hide preview" : "Show preview"}
          </button>
        </div>
        <textarea
          id={id("body")}
          name={`${locale}.body`}
          value={fields.body}
          onChange={(event) => onChange("body", event.target.value)}
          rows={16}
          dir={dir}
          lang={locale}
          spellCheck
          aria-invalid={error("bodyMd") ? true : undefined}
          aria-describedby={error("bodyMd") ? id("body-error") : undefined}
          className={`admin-input text-sm ${locale === "fa" ? "" : "font-mono"}`}
        />
        <FieldError id={id("body-error")} message={error("bodyMd")} />
        <div
          id={id("preview")}
          hidden={!previewOpen}
          dir={dir}
          lang={locale}
          className="post-body border border-rule bg-paper-raised p-5"
          aria-label={`${LANGUAGE_NAME[locale]} preview`}
          role="region"
        >
          {previewOpen ? <MarkdownBody source={deferredBody} /> : null}
        </div>
      </div>

      <SeoChecklist id={id("seo")} checks={checks} />

      <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-4">
        {saved.status === "published" ? (
          <button type="submit" name="intent" value={`unpublish:${locale}`} className="admin-button" disabled={pending}>
            Unpublish {LANGUAGE_NAME[locale]}
          </button>
        ) : (
          <button
            type="submit"
            name="intent"
            value={`publish:${locale}`}
            className="admin-button-primary"
            disabled={pending || publishBlockedReason !== null}
            aria-describedby={publishBlockedReason ? id("publish-hint") : undefined}
          >
            Publish {LANGUAGE_NAME[locale]}
          </button>
        )}
        {postId && saved.status !== "missing" ? (
          <a href={`/admin/posts/${postId}/preview/${locale}`} className="admin-button" target="_blank" rel="noopener">
            Preview saved version
          </a>
        ) : null}
        {publishBlockedReason && saved.status !== "published" ? (
          <p id={id("publish-hint")} className="text-sm text-ink-soft">
            {publishBlockedReason}
          </p>
        ) : null}
      </div>
    </fieldset>
  );
}
