import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { SiteCopy } from "@/content";
import type { Locale } from "@/i18n/config";
import { postPath } from "@/lib/blog/seo";
import { listPublished } from "@/server/blog/queries";
import { Rich } from "@/components/ui/Rich";
import { PostDates } from "./PostDates";

type Props = {
  locale: Locale;
  copy: SiteCopy;
};

/** Published posts in this language, newest first. Reads the database, so it renders inside <Suspense>. */
export async function PostList({ locale, copy }: Props) {
  const list = await listPublished();
  const items = list.items.filter((item) => item.locale === locale);

  if (items.length === 0) {
    return (
      <p className="measure border-s-2 border-contour ps-4 text-lg text-ink-soft" role="status">
        <Rich text={list.status === "unavailable" ? copy.blog.unavailable : copy.blog.empty} />
      </p>
    );
  }

  return (
    <ol aria-label={copy.blog.listLabel} className="border-t-2 border-ink">
      {items.map((item) => (
        <li key={item.slug} className="border-b border-rule">
          {/* The title link stretches over the whole entry, so the entry is one large target. */}
          <article className="group relative grid gap-3 py-8 md:grid-cols-12 md:gap-8">
            <div className="md:col-span-3">
              <PostDates locale={locale} copy={copy.blog} publishedAt={item.publishedAt} />
            </div>
            <div className="flex flex-col gap-3 md:col-span-9">
              <h2 className="text-2xl font-bold text-ink">
                <Link
                  href={postPath(locale, item.slug)}
                  className="transition-colors duration-150 after:absolute after:inset-0 group-hover:text-signal-deep"
                >
                  <Rich text={item.title} />
                </Link>
              </h2>
              {item.description ? <p className="measure text-ink-soft">{item.description}</p> : null}
              <span aria-hidden="true" className="inline-flex items-center gap-2 text-sm font-semibold text-ink underline decoration-signal/85 decoration-[1.5px] underline-offset-[0.22em]">
                {copy.blog.readMore}
                <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" strokeWidth={1.75} />
              </span>
            </div>
          </article>
        </li>
      ))}
    </ol>
  );
}

export function PostListSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="border-t-2 border-ink">
      {[0, 1, 2].map((row) => (
        <div key={row} className="grid gap-3 border-b border-rule py-8 md:grid-cols-12 md:gap-8">
          <div className="skeleton h-4 w-32 md:col-span-3" />
          <div className="flex flex-col gap-3 md:col-span-9">
            <div className="skeleton h-7 w-3/4" />
            <div className="skeleton h-4 w-full max-w-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
