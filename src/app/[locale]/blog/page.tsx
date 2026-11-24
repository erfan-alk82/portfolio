import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCopy } from "@/content";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { OPEN_GRAPH_LOCALE, blogJsonLd, feedPath } from "@/lib/blog/seo";
import { languageAlternates, siteUrl } from "@/lib/site";
import { PostList, PostListSkeleton } from "@/components/blog/PostList";
import { RssLink } from "@/components/blog/RssLink";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { JsonLd } from "@/components/ui/JsonLd";
import { Rich } from "@/components/ui/Rich";

const PATH = "/blog";

/** Static metadata: the index exists in both languages even before any post is published. */
export async function generateMetadata({ params }: PageProps<"/[locale]/blog">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = getCopy(locale);
  const image = { url: `/og/${locale}.png`, width: 1200, height: 630, alt: copy.blog.metaTitle };
  return {
    title: copy.blog.metaTitle,
    description: copy.blog.description,
    alternates: {
      canonical: `/${locale}${PATH}`,
      languages: languageAlternates(siteUrl, PATH),
      types: { "application/rss+xml": [{ url: feedPath(locale), title: copy.blog.feedTitle }] },
    },
    openGraph: {
      type: "website",
      url: `/${locale}${PATH}`,
      siteName: copy.meta.siteName,
      title: copy.blog.metaTitle,
      description: copy.blog.description,
      locale: OPEN_GRAPH_LOCALE[locale],
      alternateLocale: locales.filter((l: Locale) => l !== locale).map((l) => OPEN_GRAPH_LOCALE[l]),
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.blog.metaTitle,
      description: copy.blog.description,
      images: [image],
    },
  };
}

export default async function BlogIndexPage({ params }: PageProps<"/[locale]/blog">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = getCopy(locale);

  return (
    <>
      <SiteHeader locale={locale} copy={copy} path={PATH} />
      <main id="main" tabIndex={-1} className="outline-none">
        <div className="mx-auto max-w-[90rem] px-5 pt-10 pb-20 sm:px-8 lg:px-12 lg:pt-16 lg:pb-28">
          <header className="grid gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="flex flex-col gap-5 lg:col-span-8">
              <p className="text-sm font-semibold text-hydro">{copy.nav.blog}</p>
              <h1 className="display text-hero font-extrabold text-ink">{copy.blog.title}</h1>
              <p className="measure text-xl text-ink-soft">
                <Rich text={copy.blog.intro} />
              </p>
            </div>
            <div className="flex items-end lg:col-span-4 lg:justify-end">
              <RssLink locale={locale} copy={copy.blog} />
            </div>
          </header>
          <section aria-label={copy.blog.listLabel} className="mt-12">
            <Suspense fallback={<PostListSkeleton label={copy.blog.loading} />}>
              <PostList locale={locale} copy={copy} />
            </Suspense>
          </section>
        </div>
      </main>
      <SiteFooter copy={copy} />
      <JsonLd
        data={blogJsonLd({
          base: siteUrl,
          locale,
          name: copy.blog.feedTitle,
          description: copy.blog.description,
          authorName: copy.hero.name,
        })}
      />
    </>
  );
}
