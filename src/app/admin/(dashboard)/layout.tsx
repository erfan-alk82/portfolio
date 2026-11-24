import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { AdminUnavailableError, requireAdmin } from "@/server/auth/dal";
import { logout } from "../actions";

/**
 * Everything under the dashboard waits for a valid session. The check reads
 * the cookie (request data), so it sits inside Suspense instead of blocking
 * the layout; pages and actions check again on their own.
 */
async function SignedIn({ children }: { children: ReactNode }) {
  try {
    await requireAdmin();
  } catch (error) {
    // A database or configuration outage is not a signed-out visitor: say so instead of bouncing to login.
    if (error instanceof AdminUnavailableError) return <Unavailable />;
    throw error;
  }
  return <>{children}</>;
}

function Unavailable() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-12 sm:px-8">
      <h1 className="display text-section font-extrabold text-ink">Admin unavailable</h1>
      <p role="alert" className="measure border-s-2 border-signal ps-4 text-ink">
        The database cannot be reached right now, so nothing can be read or saved. The public site keeps working.
        Try again in a few minutes.
      </p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-12 sm:px-8">
      <div className="skeleton h-10 w-64" />
      <div className="skeleton h-40 w-full" />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-rule bg-paper">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-3 focus:z-40 focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/admin" className="display text-lg font-extrabold whitespace-nowrap text-ink">
            Blog admin
          </Link>
          <nav aria-label="Admin" className="flex items-center gap-1 sm:gap-3">
            <Link href="/admin/posts/new" className="admin-button hidden sm:inline-flex">
              New post
            </Link>
            <Link
              href="/fa/blog"
              className="hidden min-h-11 items-center px-2 text-sm font-medium text-ink-soft hover:text-signal-deep md:inline-flex"
            >
              View blog
            </Link>
            <ThemeToggle label="Night map" />
            <form action={logout}>
              <button type="submit" className="admin-button">
                <LogOut aria-hidden="true" className="size-4" strokeWidth={1.75} />
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="outline-none">
        <Suspense fallback={<DashboardSkeleton />}>
          <SignedIn>{children}</SignedIn>
        </Suspense>
      </main>
    </>
  );
}
