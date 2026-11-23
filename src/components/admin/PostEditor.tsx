"use client";

import { useActionState, useState } from "react";
import { locales, type Locale } from "@/i18n/config";
import { SLUG_MAX_LENGTH } from "@/lib/blog/schemas";
import { checkTranslationSeo, hasBlockingIssue, type TranslationState } from "@/lib/blog/seo-checks";
import {
  publishTranslation,
  savePost,
  unpublishTranslation,
  type ActionState,
} from "@/app/admin/(dashboard)/posts/actions";
import { TranslationFields } from "./TranslationFields";
import type { EditorFields, EditorPost } from "./editor-types";

type Props = {
  post: EditorPost;
  /** Shown once after a new post was created and the page reloaded on its own URL. */
  initialMessage?: string;
};

const idle: ActionState = { status: "idle" };

function fieldsOf(post: EditorPost): EditorFields {
  return Object.fromEntries(
    locales.map((locale) => {
      const { title, description, body } = post.translations[locale];
      return [locale, { title, description, body }];
    }),
  ) as EditorFields;
}

/** One form, three intents: save, publish:<locale>, unpublish:<locale> (the clicked button decides). */
async function dispatch(previous: ActionState, formData: FormData): Promise<ActionState> {
  const intent = String(formData.get("intent") ?? "save");
  const [verb, locale] = intent.split(":");
  if (verb === "publish" || verb === "unpublish") {
    const payload = new FormData();
    payload.set("id", String(formData.get("id") ?? ""));
    payload.set("publishLocale", locale ?? "");
    return verb === "publish" ? publishTranslation(previous, payload) : unpublishTranslation(previous, payload);
  }
  return savePost(previous, formData);
}

function translationState(fields: EditorFields[Locale], saved: TranslationState): TranslationState {
  if (saved === "published") return "published";
  return fields.title.trim() || fields.body.trim() ? "draft" : "missing";
}

export function PostEditor({ post, initialMessage }: Props) {
  const [state, action, pending] = useActionState(dispatch, idle);
  const [slug, setSlug] = useState(post.slug);
  const [fields, setFields] = useState<EditorFields>(() => fieldsOf(post));

  const saved = fieldsOf(post);
  const dirty =
    slug !== post.slug ||
    locales.some((l) => (["title", "description", "body"] as const).some((f) => fields[l][f] !== saved[l][f]));
  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;
  const message = state.status === "idle" ? initialMessage : state.message;

  const update = (locale: Locale) => (field: keyof EditorFields[Locale], value: string) =>
    setFields((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }));

  return (
    <form action={action} className="flex flex-col gap-10">
      {post.id ? <input type="hidden" name="id" value={post.id} /> : null}

      <div className="sticky top-16 z-20 -mx-5 flex flex-wrap items-center gap-4 border-b border-rule bg-paper px-5 py-3 sm:-mx-8 sm:px-8">
        <button type="submit" name="intent" value="save" className="admin-button-primary" disabled={pending}>
          {pending ? "Working…" : post.id ? "Save changes" : "Create draft"}
        </button>
        <p role="status" aria-live="polite" className="text-sm">
          {message ? (
            <span className={state.status === "error" ? "font-semibold text-signal-deep" : "text-ink"}>{message}</span>
          ) : dirty ? (
            <span className="text-contour-strong">Unsaved changes</span>
          ) : null}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="slug" className="text-sm font-semibold text-ink">
          Slug <span className="font-normal text-ink-soft">(shared by both languages, appears in the URL)</span>
        </label>
        <input
          id="slug"
          name="slug"
          value={slug}
          onChange={(event) => setSlug(event.target.value.toLowerCase())}
          maxLength={SLUG_MAX_LENGTH}
          dir="ltr"
          lang="en"
          autoComplete="off"
          spellCheck={false}
          required
          aria-invalid={fieldErrors?.slug ? true : undefined}
          aria-describedby={fieldErrors?.slug ? "slug-error slug-hint" : "slug-hint"}
          className="admin-input font-mono"
        />
        <p id="slug-hint" className="text-xs text-ink-soft" dir="ltr">
          /fa/blog/<strong className="text-ink">{slug || "your-slug"}</strong> and /en/blog/
          <strong className="text-ink">{slug || "your-slug"}</strong>
        </p>
        {fieldErrors?.slug ? (
          <p id="slug-error" className="text-sm font-semibold text-signal-deep">
            {fieldErrors.slug}
          </p>
        ) : null}
        {fieldErrors?.translations ? (
          <p className="text-sm font-semibold text-signal-deep">{fieldErrors.translations}</p>
        ) : null}
      </div>

      {locales.map((locale) => {
        const other = locales.find((l) => l !== locale) as Locale;
        const checks = checkTranslationSeo({
          slug,
          locale,
          title: fields[locale].title,
          description: fields[locale].description,
          bodyMd: fields[locale].body,
          otherTranslation: translationState(fields[other], post.translations[other].status),
        });
        const savedTranslation = post.translations[locale];
        const blockedReason = !post.id
          ? "Create the draft first."
          : savedTranslation.status === "missing"
            ? "Write and save this language first."
            : dirty
              ? "Save your changes before publishing."
              : hasBlockingIssue(checks)
                ? "Fix the errors in the checklist first."
                : null;
        return (
          <TranslationFields
            key={locale}
            locale={locale}
            postId={post.id}
            saved={savedTranslation}
            fields={fields[locale]}
            onChange={update(locale)}
            checks={checks}
            errors={fieldErrors}
            publishBlockedReason={blockedReason}
            pending={pending}
          />
        );
      })}
    </form>
  );
}
