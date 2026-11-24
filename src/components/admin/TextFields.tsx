"use client";

import { directionOf, type Locale } from "@/i18n/config";
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH } from "@/lib/blog/schemas";
import { DESCRIPTION_RANGE, TITLE_RANGE, titleTag } from "@/lib/blog/seo-checks";
import { displayLength } from "@/lib/text";
import { FieldError, describedBy } from "./FormControls";

type Range = { min: number; max: number };

function Counter({ id, length, range, what }: { id: string; length: number; range: Range; what: string }) {
  const inRange = length >= range.min && length <= range.max;
  return (
    <p id={id} className={`text-xs ${inRange ? "text-ink-soft" : "text-contour-strong"}`}>
      {what}: {length} characters · aim for {range.min}–{range.max}
    </p>
  );
}

type FieldProps = {
  locale: Locale;
  value: string;
  onChange: (value: string) => void;
  error: string | undefined;
  /** Extra description ids, e.g. the form-level "write at least one language" error. */
  extraDescribedBy?: string;
};

export function TitleField({ locale, value, onChange, error, extraDescribedBy }: FieldProps) {
  const id = `${locale}-title`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        Title
      </label>
      <input
        id={id}
        name={`${locale}.title`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={TITLE_MAX_LENGTH}
        dir={directionOf(locale)}
        lang={locale}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(`${id}-count`, error && `${id}-error`, extraDescribedBy)}
        className="admin-input text-lg font-semibold"
      />
      <Counter id={`${id}-count`} what="Page title with site name" length={displayLength(titleTag(locale, value))} range={TITLE_RANGE} />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export function DescriptionField({ locale, value, onChange, error }: FieldProps) {
  const id = `${locale}-description`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        Meta description
      </label>
      <textarea
        id={id}
        name={`${locale}.description`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={DESCRIPTION_MAX_LENGTH}
        rows={2}
        dir={directionOf(locale)}
        lang={locale}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(`${id}-count`, error && `${id}-error`)}
        className="admin-input"
      />
      <Counter id={`${id}-count`} what="Description" length={displayLength(value)} range={DESCRIPTION_RANGE} />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}
