import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { locales, type Locale } from "@/i18n/config";
import { postPath } from "@/lib/blog/seo";
import { DeletePostForm } from "@/components/admin/DeletePostForm";
import { PostEditor } from "@/components/admin/PostEditor";
import type { EditorPost, EditorTranslation } from "@/components/admin/editor-types";
import { getAdminPost } from "@/server/blog/admin-queries";
import type { PostRecord } from "@/server/blog/repository";

export const metadata: Metadata = { title: "Edit post" };

type Props = PageProps<"/admin/posts/[id]">;

function toEditorPost(post: PostRecord): EditorPost {
  const translations = Object.fromEntries(
    locales.map((locale): [Locale, EditorTranslation] => {
      const t = post.translations.find((translation) => translation.locale === locale);
      return [
        locale,
        t
          ? {
              title: t.title,
              description: t.description,
              body: t.bodyMd,
              status: t.status,
              publishedAt: t.publishedAt?.toISOString() ?? null,
            }
          : { title: "", description: "", body: "", status: "missing", publishedAt: null },
      ];
    }),
  ) as Record<Locale, EditorTranslation>;
  return { id: post.id, slug: post.slug, translations };
}

async function Editor({ params, searchParams }: Props) {
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const post = await getAdminPost(id);
  if (!post) notFound();
  const live = post.translations.filter((t) => t.status === "published");

  return (
    <>
      {live.length > 0 ? (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-soft">
          Live at
          {live.map((t) => (
            <a
              key={t.locale}
              href={postPath(t.locale, post.slug)}
              target="_blank"
              rel="noopener"
              className="link-signal inline-flex min-h-11 items-center gap-1 font-mono"
              dir="ltr"
            >
              {postPath(t.locale, post.slug)}
              <ExternalLink aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
            </a>
          ))}
        </p>
      ) : null}
      {/* The key resets the form state if the admin opens a different post. */}
      <PostEditor key={post.id} post={toEditorPost(post)} initialMessage={created === "1" ? "Draft created." : undefined} />
      <section aria-labelledby="danger-heading" className="flex flex-col gap-4 border-t-2 border-signal pt-6">
        <h2 id="danger-heading" className="text-xl font-bold text-ink">
          Delete
        </h2>
        <DeletePostForm id={post.id} slug={post.slug} />
      </section>
    </>
  );
}

export default function EditPostPage(props: Props) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-5 py-12 sm:px-8">
      <Link href="/admin" className="link-signal inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold">
        <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
        All posts
      </Link>
      <h1 className="display text-section font-extrabold text-ink">Edit post</h1>
      <Suspense fallback={<div className="skeleton h-96 w-full" role="status" aria-label="Loading post" />}>
        <Editor {...props} />
      </Suspense>
    </div>
  );
}
