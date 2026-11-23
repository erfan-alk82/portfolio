import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { locales, type Locale } from "@/i18n/config";
import { PostEditor } from "@/components/admin/PostEditor";
import type { EditorTranslation } from "@/components/admin/editor-types";
import { requireAdmin } from "@/server/auth/dal";

export const metadata: Metadata = { title: "New post" };

const empty: EditorTranslation = { title: "", description: "", body: "", status: "missing", publishedAt: null };

async function NewPostEditor() {
  await requireAdmin();
  const translations = Object.fromEntries(locales.map((locale) => [locale, empty])) as Record<Locale, EditorTranslation>;
  return <PostEditor post={{ id: null, slug: "", translations }} />;
}

export default function NewPostPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-5 py-12 sm:px-8">
      <Link href="/admin" className="link-signal inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold">
        <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
        All posts
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className="display text-section font-extrabold text-ink">New post</h1>
        <p className="text-ink-soft">
          Write one language or both. Each language is published on its own, and only published languages appear on the
          site, in the sitemap and in the RSS feeds.
        </p>
      </header>
      <Suspense fallback={<div className="skeleton h-96 w-full" role="status" aria-label="Loading editor" />}>
        <NewPostEditor />
      </Suspense>
    </div>
  );
}
