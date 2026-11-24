"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { locales, type Locale } from "@/i18n/config";
import type { FieldErrors } from "@/lib/blog/schemas";
import { checkTranslationSeo, hasBlockingIssue } from "@/lib/blog/seo-checks";
import {
  publishTranslation,
  savePost,
  unpublishTranslation,
  type ActionState,
} from "@/app/admin/(dashboard)/posts/actions";
import { FieldError, SubmitButton } from "./FormControls";
import { SlugField } from "./SlugField";
import { TranslationFields } from "./TranslationFields";
import { fieldsOf, isDirty, liveTranslationState, publishBlockedReason, publishedSlugChange } from "./editor-state";
import type { EditorFields, EditorPost } from "./editor-types";

type Props = {
  post: EditorPost;
  /** Shown once after a new post was created and the page reloaded on its own URL. */
  initialMessage?: string;
};

const idle: ActionState = { status: "idle" };

/** One form, three intents: save, publish:<locale>, unpublish:<locale> (the clicked button decides). */
async function dispatch(previous: ActionState, formData: FormData): Promise<ActionState> {
  const [verb, locale] = String(formData.get("intent") ?? "save").split(":");
  if (verb !== "publish" && verb !== "unpublish") return savePost(previous, formData);
  const payload = new FormData();
  payload.set("id", String(formData.get("id") ?? ""));
  payload.set("publishLocale", locale ?? "");
  return verb === "publish" ? publishTranslation(previous, payload) : unpublishTranslation(previous, payload);
}

function Toolbar({ state, pending, dirty, isNew, initialMessage }: { state: ActionState; pending: boolean; dirty: boolean; isNew: boolean; initialMessage?: string }) {
  const message = state.status === "idle" ? initialMessage : state.message;
  const isError = state.status === "error";
  return (
    <div className="sticky top-16 z-20 -mx-5 flex flex-wrap items-center gap-4 border-b border-rule bg-paper px-5 py-3 sm:-mx-8 sm:px-8">
      <SubmitButton name="intent" value="save" className="admin-button-primary" unavailable={pending}>
        {pending ? "Working…" : isNew ? "Create draft" : "Save changes"}
      </SubmitButton>
      {/* Errors interrupt (alert); confirmations and the unsaved hint are polite. */}
      <p role={isError ? "alert" : "status"} className="text-sm">
        {message ? (
          <span className={isError ? "font-semibold text-signal-deep" : "text-ink"}>{message}</span>
        ) : dirty ? (
          <span className="text-contour-strong">Unsaved changes</span>
        ) : null}
      </p>
    </div>
  );
}

/** After a failed save, move focus to the first field that needs attention. */
function useFocusFirstInvalid(state: ActionState) {
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status !== "error" || !state.fieldErrors) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);
  return formRef;
}

export function PostEditor({ post, initialMessage }: Props) {
  const [state, action, pending] = useActionState(dispatch, idle);
  const [slug, setSlug] = useState(post.slug);
  const [fields, setFields] = useState<EditorFields>(() => fieldsOf(post));
  const formRef = useFocusFirstInvalid(state);
  const dirty = isDirty(post, slug, fields);
  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;
  const update = (locale: Locale) => (field: keyof EditorFields[Locale], value: string) =>
    setFields((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }));

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-10">
      {post.id ? <input type="hidden" name="id" value={post.id} /> : null}
      <Toolbar state={state} pending={pending} dirty={dirty} isNew={!post.id} initialMessage={initialMessage} />
      <SlugField
        value={slug}
        onChange={setSlug}
        error={fieldErrors?.slug}
        renamesLiveUrl={publishedSlugChange(post, slug)}
        savedSlug={post.slug}
      />
      <FieldError id="translations-error" message={fieldErrors?.translations} />
      {locales.map((locale) => (
        <LanguageSection
          key={locale}
          locale={locale}
          post={post}
          slug={slug}
          fields={fields}
          dirty={dirty}
          pending={pending}
          errors={fieldErrors}
          onChange={update(locale)}
        />
      ))}
    </form>
  );
}

type SectionProps = {
  locale: Locale;
  post: EditorPost;
  slug: string;
  fields: EditorFields;
  dirty: boolean;
  pending: boolean;
  errors: FieldErrors | undefined;
  onChange: (field: keyof EditorFields[Locale], value: string) => void;
};

/** One language with its live SEO checklist and the reason publishing is blocked, if any. */
function LanguageSection({ locale, post, slug, fields, dirty, pending, errors, onChange }: SectionProps) {
  const other = locales.find((l) => l !== locale) as Locale;
  const saved = post.translations[locale];
  const checks = checkTranslationSeo({
    slug: slug.trim(),
    locale,
    title: fields[locale].title,
    description: fields[locale].description,
    bodyMd: fields[locale].body,
    otherTranslation: liveTranslationState(fields[other], post.translations[other].status),
  });
  const blockedReason = publishBlockedReason({ postId: post.id, saved: saved.status, dirty, blocking: hasBlockingIssue(checks) });
  return (
    <TranslationFields
      locale={locale}
      postId={post.id}
      saved={saved}
      fields={fields[locale]}
      onChange={onChange}
      checks={checks}
      errors={errors}
      formErrorId={errors?.translations ? "translations-error" : undefined}
      publishBlockedReason={blockedReason}
      pending={pending}
    />
  );
}
