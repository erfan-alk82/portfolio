import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCopy } from "@/content";
import { directionOf, isLocale } from "@/i18n/config";
import { MarkdownBody } from "@/components/blog/MarkdownBody";
import { PostDates } from "@/components/blog/PostDates";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Rich } from "@/components/ui/Rich";
import { getAdminPost } from "@/server/blog/admin-queries";

export const metadata: Metadata = { title: "Preview" };

type Props = PageProps<"/admin/posts/[id]/preview/[locale]">;

/** The saved version of one language, drafts included, rendered as the public page would render it. */
async function Preview({ params }: Props) {
  const { id, locale } = await params;
  if (!isLocale(locale)) notFound();
  const post = await getAdminPost(id);
  const translation = post?.translations.find((t) => t.locale === locale);
  if (!post || !translation) notFound();
  const copy = getCopy(locale);

  return (
    <>
      <p className="flex flex-wrap items-center gap-3 border-s-2 border-contour ps-4 text-sm text-ink">
        Preview of the saved version. Status: <StatusBadge status={translation.status} />
      </p>
      <article lang={locale} dir={directionOf(locale)} className="flex flex-col gap-5 border-t-2 border-ink pt-8">
        {translation.publishedAt ? (
          <PostDates
            locale={locale}
            copy={copy.blog}
            publishedAt={translation.publishedAt.toISOString()}
            updatedAt={translation.updatedAt.toISOString()}
          />
        ) : null}
        <h1 className="display text-section font-extrabold text-ink">
          <Rich text={translation.title} />
        </h1>
        {translation.description ? <p className="measure text-xl text-ink-soft">{translation.description}</p> : null}
        <div className="post-body measure mt-6">
          <MarkdownBody source={translation.bodyMd} />
        </div>
      </article>
    </>
  );
}

export default async function PreviewPage(props: Props) {
  return (
    <div className="mx-auto flex max-w-[90rem] flex-col gap-8 px-5 py-12 sm:px-8 lg:px-12">
      <Suspense fallback={<div className="skeleton h-12 w-48" />}>
        <BackToEditor params={props.params} />
      </Suspense>
      <Suspense fallback={<div className="skeleton h-96 w-full" role="status" aria-label="Loading preview" />}>
        <Preview {...props} />
      </Suspense>
    </div>
  );
}

async function BackToEditor({ params }: { params: Props["params"] }) {
  const { id } = await params;
  return (
    <Link
      href={`/admin/posts/${encodeURIComponent(id)}`}
      className="link-signal inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold"
    >
      <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
      Back to the editor
    </Link>
  );
}
