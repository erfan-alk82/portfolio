import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { ArrowLeft } from "lucide-react";
import { getCopy, type SiteCopy } from "@/content";
import { isLocale, type Locale } from "@/i18n/config";
import { buildPostMetadata, postPath } from "@/lib/blog/seo";
import { siteUrl } from "@/lib/site";
import { getPublishedPost } from "@/server/blog/queries";
import { MarkdownBody } from "@/components/blog/MarkdownBody";
import { PostDates } from "@/components/blog/PostDates";
import { PostJsonLd } from "@/components/blog/PostJsonLd";
import { RssLink } from "@/components/blog/RssLink";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Rich } from "@/components/ui/Rich";

type Params = PageProps<"/[locale]/blog/[slug]">["params"];

/**
 * Per-post SEO: title, description, canonical, hreflang for published
 * languages only, Open Graph article dates. Unknown or unpublished slugs
 * render the 404 page, which Next marks noindex.
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const post = await getPublishedPost(slug, locale);
  if (!post) return { robots: { index: false, follow: true } };
  return buildPostMetadata(post, { base: siteUrl, siteName: getCopy(locale).meta.siteName });
}

const container = "mx-auto max-w-[90rem] px-5 pt-10 pb-20 sm:px-8 lg:px-12 lg:pt-16 lg:pb-28";

function BackLink({ locale, copy }: { locale: Locale; copy: SiteCopy }) {
  return (
    <Link href={`/${locale}/blog`} className="link-signal inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
      <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" strokeWidth={1.75} />
      {copy.blog.backToBlog}
    </Link>
  );
}

async function PostView({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const post = await getPublishedPost(slug, locale);
  if (!post) notFound();
  const copy = getCopy(locale);
  const other = post.publishedLocales.find((l) => l !== locale);

  return (
    <>
      <article className={container} lang={locale}>
        <BackLink locale={locale} copy={copy} />
        <header className="mt-8 grid gap-8 border-b border-ink pb-10 lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col gap-5 lg:col-span-9">
            <PostDates locale={locale} copy={copy.blog} publishedAt={post.publishedAt} updatedAt={post.updatedAt} />
            <h1 className="display text-section font-extrabold text-ink">
              <Rich text={post.title} />
            </h1>
            {post.description ? <p className="measure text-xl text-ink-soft">{post.description}</p> : null}
          </div>
          <div className="flex flex-col items-start gap-1 lg:col-span-3 lg:items-end lg:justify-end">
            {other ? (
              <Link
                href={postPath(other, post.slug)}
                hrefLang={other}
                className="link-signal inline-flex min-h-11 items-center text-sm font-semibold"
              >
                {copy.blog.otherLanguage}
              </Link>
            ) : null}
            <RssLink locale={locale} copy={copy.blog} />
          </div>
        </header>
        <div className="post-body measure mt-12">
          <MarkdownBody source={post.bodyMd} />
        </div>
        <nav aria-label={copy.blog.listLabel} className="mt-20 border-t border-ink pt-8">
          <BackLink locale={locale} copy={copy} />
        </nav>
      </article>
      <PostJsonLd post={post} />
    </>
  );
}

function PostSkeleton({ label }: { label: string }) {
  return (
    <div className={container} role="status" aria-label={label}>
      <div className="skeleton h-4 w-32" />
      <div className="mt-8 flex flex-col gap-5 border-b border-ink pb-10">
        <div className="skeleton h-4 w-48" />
        <div className="skeleton h-14 w-full max-w-3xl" />
        <div className="skeleton h-6 w-full max-w-2xl" />
      </div>
      <div className="mt-12 flex max-w-[66ch] flex-col gap-4">
        {[0, 1, 2, 3].map((line) => (
          <div key={line} className="skeleton h-4 w-full" />
        ))}
      </div>
    </div>
  );
}

export default async function BlogPostPage({ params }: { params: Params }) {
  // The locale is a root param known at build time, so the header and footer are in the static shell;
  // the post itself (runtime slug + database) streams in behind the skeleton.
  const locale = await rootLocale();
  if (!isLocale(locale)) notFound();
  const copy = getCopy(locale);

  return (
    <>
      {/* The other language may not have this post, so the switch leads to its blog index. */}
      <SiteHeader locale={locale} copy={copy} path="/blog" />
      <main id="main" tabIndex={-1} className="outline-none">
        <Suspense fallback={<PostSkeleton label={copy.blog.loading} />}>
          <PostView params={params} />
        </Suspense>
      </main>
      <SiteFooter copy={copy} />
    </>
  );
}
