"use client";

import { useDeferredValue, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { LANGUAGE_NAME_EN, directionOf, type Locale } from "@/i18n/config";
import { MarkdownBody } from "@/components/blog/MarkdownBody";
import { FieldError } from "./FormControls";

type Props = {
  locale: Locale;
  value: string;
  onChange: (value: string) => void;
  error: string | undefined;
};

function PreviewToggle({ open, controls, onToggle }: { open: boolean; controls: string; onToggle: () => void }) {
  const Icon = open ? EyeOff : Eye;
  return (
    <button type="button" className="admin-button min-h-9 px-3 text-sm" aria-expanded={open} aria-controls={controls} onClick={onToggle}>
      <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
      {open ? "Hide preview" : "Show preview"}
    </button>
  );
}

/** Markdown body with a live preview rendered by the same component as the public page. */
export function BodyField({ locale, value, onChange, error }: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const deferred = useDeferredValue(value);
  const id = `${locale}-body`;
  const dir = directionOf(locale);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          Body <span className="font-normal text-ink-soft">(Markdown; wrap Latin terms as [[term]])</span>
        </label>
        <PreviewToggle open={previewOpen} controls={`${id}-preview`} onToggle={() => setPreviewOpen((open) => !open)} />
      </div>
      <textarea
        id={id}
        name={`${locale}.body`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={16}
        dir={dir}
        lang={locale}
        spellCheck
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        // Monospace fonts lack Persian joining forms, so only English gets one.
        className={`admin-input text-sm ${locale === "fa" ? "" : "font-mono"}`}
      />
      <FieldError id={`${id}-error`} message={error} />
      <div
        id={`${id}-preview`}
        role="region"
        aria-label={`${LANGUAGE_NAME_EN[locale]} preview`}
        hidden={!previewOpen}
        dir={dir}
        lang={locale}
        className="post-body border border-rule bg-paper-raised p-5"
      >
        {previewOpen ? <MarkdownBody source={deferred} /> : null}
      </div>
    </div>
  );
}
