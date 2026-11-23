"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { parsePostForm, postIdSchema, translationActionSchema, type FieldErrors } from "@/lib/blog/schemas";
import { checkTranslationSeo, hasBlockingIssue, type TranslationState } from "@/lib/blog/seo-checks";
import { verifyAdminForAction } from "@/server/auth/dal";
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
 * Every action re-checks the admin session first (actions are public POST
 * endpoints), validates its input with zod, and expires the public caches it
 * affects with updateTag, so the change is live on the next request.
 */

export type ActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: FieldErrors };

const UNAVAILABLE: ActionState = { status: "error", message: "The database could not be reached. Nothing was changed." };
const SIGNED_OUT: ActionState = { status: "error", message: "Your session has ended. Sign in again, then retry." };

async function authorized(): Promise<boolean> {
  try {
    await verifyAdminForAction();
    return true;
  } catch {
    return false;
  }
}

function failure(context: string, error: unknown): ActionState {
  unstable_rethrow(error);
  console.error(`[admin] ${context} failed:`, error instanceof Error ? error.message : error);
  return UNAVAILABLE;
}

export async function savePost(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await authorized())) return SIGNED_OUT;
  const rawId = formData.get("id");
  const id = rawId ? postIdSchema.safeParse(rawId) : null;
  if (id && !id.success) return { status: "error", message: "Unknown post." };

  const parsed = parsePostForm(formData);
  if (!parsed.success) {
    return { status: "error", message: "Check the highlighted fields.", fieldErrors: parsed.errors };
  }

  let created: PostRecord | null = null;
  try {
    if (!id) {
      created = await createPost(parsed.data);
      expirePostCaches(created.slug);
    } else {
      const result = await updatePost(id.data, parsed.data);
      if (!result) return { status: "error", message: "This post no longer exists." };
      expirePostCaches(result.post.slug, result.previousSlug);
      return { status: "success", message: "Saved." };
    }
  } catch (error) {
    if (error instanceof SlugTakenError) {
      return { status: "error", message: "Check the highlighted fields.", fieldErrors: { slug: "Another post already uses this slug." } };
    }
    if (error instanceof PublishedTranslationRemovalError) {
      return {
        status: "error",
        message: `The ${error.locale === "fa" ? "Persian" : "English"} version is published. Unpublish it before clearing its fields.`,
      };
    }
    return failure("saving a post", error);
  }
  redirect(`/admin/posts/${created.id}?created=1`);
}

function otherState(post: PostRecord, locale: Locale): TranslationState {
  const other = post.translations.find((t) => t.locale !== locale);
  if (!other) return "missing";
  return other.status === "published" ? "published" : "draft";
}

async function changeStatus(formData: FormData, status: "published" | "draft"): Promise<ActionState> {
  if (!(await authorized())) return SIGNED_OUT;
  const parsed = translationActionSchema.safeParse({ id: formData.get("id"), locale: formData.get("publishLocale") });
  if (!parsed.success) return { status: "error", message: "Unknown post or language." };
  const { id, locale } = parsed.data;
  const language = locale === "fa" ? "Persian" : "English";

  try {
    const post = await getPostById(id);
    const translation = post?.translations.find((t) => t.locale === locale);
    if (!post || !translation) return { status: "error", message: `Save the ${language} version first.` };

    if (status === "published") {
      // The checklist is advice in the browser but a rule here: errors block publishing.
      const checks = checkTranslationSeo({ ...translation, slug: post.slug, locale, otherTranslation: otherState(post, locale) });
      if (hasBlockingIssue(checks)) {
        const blocking = checks.filter((c) => !c.passed && c.severity === "error").map((c) => c.message);
        return { status: "error", message: `Cannot publish the ${language} version yet: ${blocking.join(" ")}` };
      }
    }
    await setTranslationStatus(id, locale, status);
    expirePostCaches(post.slug);
    return {
      status: "success",
      message: status === "published" ? `The ${language} version is live.` : `The ${language} version is back to draft.`,
    };
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
  if (!(await authorized())) return SIGNED_OUT;
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
