import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Plus } from "lucide-react";
import { locales } from "@/i18n/config";
import { formatPostDate } from "@/lib/dates";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { listAdminPosts } from "@/server/blog/admin-queries";
import type { AdminPostSummary } from "@/server/blog/repository";

export const metadata: Metadata = { title: "Posts" };

const LANGUAGE = { fa: "Persian", en: "English" } as const;

function NewPostButton() {
  return (
    <Link href="/admin/posts/new" className="admin-button-primary">
      <Plus aria-hidden="true" className="size-4" strokeWidth={2} />
      New post
    </Link>
  );
}

/** English title when there is one, otherwise the Persian one, otherwise the slug. */
function displayTitle(post: AdminPostSummary): { text: string; lang: string } {
  const preferred = post.translations.find((t) => t.locale === "en") ?? post.translations[0];
  return preferred ? { text: preferred.title, lang: preferred.locale } : { text: post.slug, lang: "en" };
}

async function PostTable() {
  let posts: AdminPostSummary[];
  try {
    posts = await listAdminPosts();
  } catch (error) {
    unstable_rethrow(error);
    console.error("[admin] listing posts failed:", error instanceof Error ? error.message : error);
    return (
      <p role="alert" className="border-s-2 border-signal ps-4 text-ink">
        The database could not be reached, so the posts cannot be listed right now.
      </p>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 border-t-2 border-ink pt-8">
        <p className="text-lg text-ink-soft">No posts yet. Write the first one in Persian, English or both.</p>
        <NewPostButton />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border-t-2 border-ink">
      <table className="w-full min-w-[40rem]">
        <caption className="sr-only">All posts, most recently edited first</caption>
        <thead>
          <tr className="border-b border-ink text-sm text-ink-soft">
            <th scope="col" className="py-3 pe-4 text-start font-semibold">
              Post
            </th>
            {locales.map((locale) => (
              <th key={locale} scope="col" className="py-3 pe-4 text-start font-semibold">
                {LANGUAGE[locale]}
              </th>
            ))}
            <th scope="col" className="py-3 text-start font-semibold">
              Last edited
            </th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => {
            const title = displayTitle(post);
            return (
              <tr key={post.id} className="border-b border-rule align-top">
                <td className="py-4 pe-4">
                  <Link
                    href={`/admin/posts/${post.id}`}
                    lang={title.lang}
                    dir="auto"
                    className="font-semibold text-ink underline decoration-signal/60 underline-offset-4 hover:text-signal-deep"
                  >
                    {title.text}
                  </Link>
                  <p className="mt-1 font-mono text-xs text-ink-soft" dir="ltr">
                    {post.slug}
                  </p>
                </td>
                {locales.map((locale) => (
                  <td key={locale} className="py-4 pe-4">
                    <StatusBadge status={post.translations.find((t) => t.locale === locale)?.status ?? "missing"} />
                  </td>
                ))}
                <td className="py-4 text-sm whitespace-nowrap text-ink-soft">
                  <time dateTime={post.updatedAt.toISOString()}>{formatPostDate("en", post.updatedAt.toISOString())}</time>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function DeletedNotice({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const { deleted } = await searchParams;
  if (deleted !== "1") return null;
  return (
    <p role="status" className="border-s-2 border-vegetation ps-4 text-ink">
      The post was deleted.
    </p>
  );
}

export default function AdminHomePage({ searchParams }: PageProps<"/admin">) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-12 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-hydro">Blog admin</p>
          <h1 className="display text-section font-extrabold text-ink">Posts</h1>
        </div>
        <NewPostButton />
      </header>
      <Suspense fallback={null}>
        <DeletedNotice searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<div className="skeleton h-48 w-full" role="status" aria-label="Loading posts" />}>
        <PostTable />
      </Suspense>
    </div>
  );
}
