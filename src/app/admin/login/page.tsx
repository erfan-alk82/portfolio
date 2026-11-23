import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { LoginForm } from "@/components/admin/LoginForm";
import { getAdminSession } from "@/server/auth/dal";
import { isDatabaseConfigured } from "@/server/db/client";
import { authConfig } from "@/server/env";

export const metadata: Metadata = { title: "Sign in" };

/** Says which variables are missing (names only, never values), so a fresh deploy is easy to finish. */
function NotConfigured({ problems }: { problems: string[] }) {
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
  if (problems.length > 0) return <NotConfigured problems={problems} />;
  if (await getAdminSession()) redirect("/admin");
  return <LoginForm />;
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
