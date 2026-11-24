"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { LANGUAGE_NAME_EN, type Locale } from "@/i18n/config";
import { parsePostForm, postIdSchema, translationActionSchema, type FieldErrors } from "@/lib/blog/schemas";
import { checkTranslationSeo, hasBlockingIssue, type TranslationState } from "@/lib/blog/seo-checks";
import { checkAdminForAction } from "@/server/auth/dal";
import {
  PublishedTranslationRemovalError,
  SlugTakenError,
  createPost,
  deletePost as removePost,
  getPostById,
  setTranslationStatus,
  updatePost,
  type PostRecord,
} from "@/server/blog/repository";
import { expirePostCaches } from "@/server/blog/revalidate";

/**
 * Every action checks the admin session first (actions are public POST
 * endpoints), validates its input with zod, and expires the public caches it
 * affects with updateTag, so the change is live on the next request.
 */

export type ActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: FieldErrors };

const UNAVAILABLE: ActionState = { status: "error", message: "The database could not be reached. Nothing was changed." };
const SIGNED_OUT: ActionState = { status: "error", message: "Your session has ended. Sign in again, then retry." };

/** null when the admin may proceed, otherwise the state to return. */
async function denied(): Promise<ActionState | null> {
  const access = await checkAdminForAction();
  if (access === "signed-in") return null;
  return access === "unavailable" ? UNAVAILABLE : SIGNED_OUT;
}

function failure(context: string, error: unknown): ActionState {
  unstable_rethrow(error);
  console.error(`[admin] ${context} failed:`, error instanceof Error ? error.message : error);
  return UNAVAILABLE;
}

function invalidFields(fieldErrors: FieldErrors): ActionState {
  return { status: "error", message: "Check the highlighted fields.", fieldErrors };
}

function saveError(error: unknown): ActionState {
  if (error instanceof SlugTakenError) return invalidFields({ slug: "Another post already uses this slug." });
  if (error instanceof PublishedTranslationRemovalError) {
    return {
      status: "error",
      message: `The ${LANGUAGE_NAME_EN[error.locale]} version is published. Unpublish it before clearing its fields.`,
    };
  }
  return failure("saving a post", error);
}

export async function savePost(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await denied();
  if (blocked) return blocked;
  const rawId = formData.get("id");
  const id = rawId ? postIdSchema.safeParse(rawId) : null;
  if (id && !id.success) return { status: "error", message: "Unknown post." };
  const parsed = parsePostForm(formData);
  if (!parsed.success) return invalidFields(parsed.errors);

  let createdId: string;
  try {
    if (id) {
      const result = await updatePost(id.data, parsed.data);
      if (!result) return { status: "error", message: "This post no longer exists." };
      expirePostCaches(result.post.slug, result.previousSlug);
      return { status: "success", message: "Saved." };
    }
    const created = await createPost(parsed.data);
    expirePostCaches(created.slug);
    createdId = created.id;
  } catch (error) {
    return saveError(error);
  }
  redirect(`/admin/posts/${createdId}?created=1`);
}

function otherState(post: PostRecord, locale: Locale): TranslationState {
  const other = post.translations.find((t) => t.locale !== locale);
  if (!other) return "missing";
  return other.status === "published" ? "published" : "draft";
}

/** The checklist is advice in the browser but a rule here: errors block publishing. */
function publishBlocker(post: PostRecord, locale: Locale): string | null {
  const translation = post.translations.find((t) => t.locale === locale);
  if (!translation) return `Save the ${LANGUAGE_NAME_EN[locale]} version first.`;
  const checks = checkTranslationSeo({ ...translation, slug: post.slug, locale, otherTranslation: otherState(post, locale) });
  if (!hasBlockingIssue(checks)) return null;
  const blocking = checks.filter((c) => !c.passed && c.severity === "error").map((c) => c.message);
  return `Cannot publish the ${LANGUAGE_NAME_EN[locale]} version yet: ${blocking.join(" ")}`;
}

async function changeStatus(formData: FormData, status: "published" | "draft"): Promise<ActionState> {
  const blocked = await denied();
  if (blocked) return blocked;
  const parsed = translationActionSchema.safeParse({ id: formData.get("id"), locale: formData.get("publishLocale") });
  if (!parsed.success) return { status: "error", message: "Unknown post or language." };
  const { id, locale } = parsed.data;
  const language = LANGUAGE_NAME_EN[locale];
  try {
    const post = await getPostById(id);
    if (!post || !post.translations.some((t) => t.locale === locale)) {
      return { status: "error", message: `Save the ${language} version first.` };
    }
    const blocker = status === "published" ? publishBlocker(post, locale) : null;
    if (blocker) return { status: "error", message: blocker };
    await setTranslationStatus(id, locale, status);
    expirePostCaches(post.slug);
    const message = status === "published" ? `The ${language} version is live.` : `The ${language} version is back to draft.`;
    return { status: "success", message };
  } catch (error) {
    return failure(`changing a translation to ${status}`, error);
  }
}

export async function publishTranslation(_previous: ActionState, formData: FormData): Promise<ActionState> {
  return changeStatus(formData, "published");
}

export async function unpublishTranslation(_previous: ActionState, formData: FormData): Promise<ActionState> {
  return changeStatus(formData, "draft");
}

/** Deleting needs the slug typed back as confirmation; there is no undo. */
export async function deletePost(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await denied();
  if (blocked) return blocked;
  const id = postIdSchema.safeParse(formData.get("id"));
  if (!id.success) return { status: "error", message: "Unknown post." };
  const confirmation = String(formData.get("confirmSlug") ?? "").trim();
  try {
    const post = await getPostById(id.data);
    if (!post) return { status: "error", message: "This post no longer exists." };
    if (confirmation !== post.slug) {
      return { status: "error", message: "Type the slug exactly to confirm.", fieldErrors: { confirmSlug: "Does not match the slug." } };
    }
    const deleted = await removePost(id.data);
    expirePostCaches(deleted?.slug ?? post.slug);
  } catch (error) {
    return failure("deleting a post", error);
  }
  redirect("/admin?deleted=1");
}
