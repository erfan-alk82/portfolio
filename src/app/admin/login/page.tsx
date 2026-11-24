import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { LoginForm } from "@/components/admin/LoginForm";
import { getAdminAccess } from "@/server/auth/dal";
import { isDatabaseConfigured } from "@/server/db/client";
import { authConfig, isProduction } from "@/server/env";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Outside production it names the missing variables (names only, never values),
 * so a fresh setup is easy to finish. In production visitors only learn that
 * sign-in is unavailable; the names go to the server log.
 */
function NotConfigured({ problems }: { problems: string[] }) {
  if (isProduction()) {
    return (
      <p role="status" className="border-s-2 border-contour ps-4 text-ink">
        Signing in is not available right now.
      </p>
    );
  }
  return (
    <div role="status" className="flex flex-col gap-3 border-s-2 border-contour ps-4 text-ink-soft">
      <p className="font-semibold text-ink">The admin is not configured on this server.</p>
      <p>
        Set{" "}
        {problems.map((name, i) => (
          <span key={name}>
            <code className="font-semibold text-ink">{name}</code>
            {i < problems.length - 1 ? ", " : ""}
          </span>
        ))}{" "}
        in the server environment and restart it. See the README, section “Blog and admin”.
      </p>
    </div>
  );
}

async function LoginGate() {
  await connection();
  const auth = authConfig();
  const problems = [...(isDatabaseConfigured() ? [] : ["DATABASE_URL"]), ...(auth.ok ? [] : auth.problems)];
  if (problems.length > 0) {
    console.error(`[admin] sign-in disabled; missing or invalid: ${problems.join(", ")}`);
    return <NotConfigured problems={problems} />;
  }
  const access = await getAdminAccess();
  if (access.status === "signed-in") redirect("/admin");
  return (
    <>
      {access.status === "unavailable" ? (
        <p role="status" className="border-s-2 border-contour ps-4 text-ink">
          The database cannot be reached right now, so signing in may fail. Try again in a few minutes.
        </p>
      ) : null}
      <LoginForm />
    </>
  );
}

export default function LoginPage() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-5 py-16">
      <header className="flex flex-col gap-2 border-b-2 border-ink pb-6">
        <p className="text-sm font-semibold text-hydro">Blog admin</p>
        <h1 className="display text-4xl font-extrabold text-ink">Sign in</h1>
      </header>
      <Suspense fallback={<div className="skeleton h-56 w-full" role="status" aria-label="Loading" />}>
        <LoginGate />
      </Suspense>
    </main>
  );
}
