"use client";

import { LANGUAGE_NAME_EN, type Locale } from "@/i18n/config";
import type { FieldErrors } from "@/lib/blog/schemas";
import type { SeoCheck } from "@/lib/blog/seo-checks";
import { BodyField } from "./BodyField";
import { PublishBar } from "./PublishBar";
import { SeoChecklist } from "./SeoChecklist";
import { StatusBadge } from "./StatusBadge";
import { DescriptionField, TitleField } from "./TextFields";
import type { EditorFields, EditorTranslation } from "./editor-types";

type Props = {
  locale: Locale;
  postId: string | null;
  saved: EditorTranslation;
  fields: EditorFields[Locale];
  onChange: (field: keyof EditorFields[Locale], value: string) => void;
  checks: readonly SeoCheck[];
  errors: FieldErrors | undefined;
  /** id of the form-level "write at least one language" error, when shown. */
  formErrorId: string | undefined;
  publishBlockedReason: string | null;
  pending: boolean;
};

const NATIVE_NAME: Record<Locale, string> = { fa: "فارسی", en: "English" };

function Heading({ locale, saved }: { locale: Locale; saved: EditorTranslation }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h2 className="text-2xl font-bold text-ink">
        {LANGUAGE_NAME_EN[locale]}{" "}
        <span lang={locale} className="font-normal text-ink-soft">
          ({NATIVE_NAME[locale]})
        </span>
      </h2>
      <p id={`${locale}-status`} className="flex items-center gap-3">
        <StatusBadge status={saved.status} />
        {saved.publishedAt ? (
          <span className="text-sm text-ink-soft">
            first published <time dateTime={saved.publishedAt}>{saved.publishedAt.slice(0, 10)}</time>
          </span>
        ) : null}
      </p>
    </div>
  );
}

/** One language of a post: fields, live preview, SEO checklist and publish controls. */
export function TranslationFields(props: Props) {
  const { locale, saved, fields, onChange, errors } = props;
  const error = (name: string) => errors?.[`${locale}.${name}`];
  return (
    <fieldset className="flex flex-col gap-5 border-t-2 border-ink pt-6" aria-describedby={`${locale}-status`}>
      <legend className="sr-only">{LANGUAGE_NAME_EN[locale]} version</legend>
      <Heading locale={locale} saved={saved} />
      <TitleField
        locale={locale}
        value={fields.title}
        onChange={(v) => onChange("title", v)}
        error={error("title")}
        extraDescribedBy={props.formErrorId}
      />
      <DescriptionField locale={locale} value={fields.description} onChange={(v) => onChange("description", v)} error={error("description")} />
      <BodyField locale={locale} value={fields.body} onChange={(v) => onChange("body", v)} error={error("bodyMd")} />
      <SeoChecklist id={`${locale}-seo`} checks={props.checks} />
      <PublishBar
        locale={locale}
        postId={props.postId}
        saved={saved.status}
        blockedReason={props.publishBlockedReason}
        pending={props.pending}
      />
    </fieldset>
  );
}
