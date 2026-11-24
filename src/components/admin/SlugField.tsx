"use client";

import { SLUG_MAX_LENGTH } from "@/lib/blog/schemas";
import { FieldError, describedBy } from "./FormControls";

type Props = {
  value: string;
  onChange: (value: string) => void;
  error: string | undefined;
  /** The post is live and the slug changed: its public URLs will stop working. */
  renamesLiveUrl: boolean;
  savedSlug: string;
};

export function SlugField({ value, onChange, error, renamesLiveUrl, savedSlug }: Props) {
  const shown = value.trim() || "your-slug";
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="slug" className="text-sm font-semibold text-ink">
        Slug <span className="font-normal text-ink-soft">(shared by both languages, appears in the URL)</span>
      </label>
      <input
        id="slug"
        name="slug"
        value={value}
        onChange={(event) => onChange(event.target.value.toLowerCase())}
        maxLength={SLUG_MAX_LENGTH}
        dir="ltr"
        lang="en"
        autoComplete="off"
        spellCheck={false}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy("slug-hint", renamesLiveUrl && "slug-warning", error && "slug-error")}
        className="admin-input font-mono"
      />
      <p id="slug-hint" className="text-xs text-ink-soft" dir="ltr">
        /fa/blog/<strong className="text-ink">{shown}</strong> and /en/blog/<strong className="text-ink">{shown}</strong>
      </p>
      {renamesLiveUrl ? (
        <p id="slug-warning" role="status" className="border-s-2 border-contour ps-3 text-sm text-ink">
          This post is published. After saving, the old URL (<code dir="ltr">/…/blog/{savedSlug}</code>) will stop
          working; links to it will show the 404 page.
        </p>
      ) : null}
      <FieldError id="slug-error" message={error} />
    </div>
  );
}
