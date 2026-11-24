import Link from "next/link";

export default function AdminNotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-5 sm:px-8">
      <p className="text-sm text-contour-strong">Admin</p>
      <h1 className="display text-section font-extrabold text-ink">Not found</h1>
      <p className="text-lg text-ink-soft">This admin page or post does not exist.</p>
      <Link
        href="/admin"
        className="inline-flex min-h-12 w-fit items-center rounded-sm bg-ink px-6 font-semibold text-paper transition-colors duration-150 hover:bg-signal-deep"
      >
        Back to posts
      </Link>
    </main>
  );
}
