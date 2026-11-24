import "server-only";
import { cache } from "react";
import { redirect, unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { isDatabaseConfigured } from "../db/client";
import { authConfig } from "../env";
import { readAdminSession } from "./session";

/**
 * Data Access Layer for the admin: the only way admin code learns whether
 * the visitor is signed in. Pages call requireAdmin(); Server Actions call
 * checkAdminForAction() first thing, because a rendered-only check is not a
 * security boundary (actions are plain POST endpoints).
 *
 * "unavailable" (configuration missing or the database unreachable) is kept
 * apart from "signed-out", so an outage never looks like an expired session.
 */

export interface AdminSession {
  expiresAt: Date;
}

export type AdminAccess =
  | { status: "signed-in"; session: AdminSession }
  | { status: "signed-out" }
  | { status: "unavailable" };

/** Memoized per request, so the layout and the page share one database lookup. */
export const getAdminAccess = cache(async (): Promise<AdminAccess> => {
  // Always a request-time decision: without this, a build with no admin env would
  // prerender the "signed out" redirect into the static shell.
  await connection();
  const auth = authConfig();
  if (!auth.ok || !isDatabaseConfigured()) return { status: "unavailable" };
  try {
    const session = await readAdminSession(auth.config.sessionSecret);
    return session ? { status: "signed-in", session } : { status: "signed-out" };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[admin] session lookup failed:", error instanceof Error ? error.message : error);
    return { status: "unavailable" };
  }
});

export class AdminUnavailableError extends Error {
  constructor() {
    super("The admin is unavailable: configuration or database problem");
    this.name = "AdminUnavailableError";
  }
}

/** Signed out → login page. Unavailable → AdminUnavailableError, which the dashboard shows as a notice. */
export async function requireAdmin(): Promise<AdminSession> {
  const access = await getAdminAccess();
  if (access.status === "signed-out") redirect("/admin/login");
  if (access.status === "unavailable") throw new AdminUnavailableError();
  return access.session;
}

/** For Server Actions, which report the state instead of redirecting. */
export async function checkAdminForAction(): Promise<AdminAccess["status"]> {
  return (await getAdminAccess()).status;
}
