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
 * verifyAdminForAction() first thing, because a rendered-only check is not a
 * security boundary (actions are plain POST endpoints).
 */

export interface AdminSession {
  expiresAt: Date;
}

/** Memoized per request, so the layout and the page share one database lookup. */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  // Always a request-time decision: without this, a build with no admin env would
  // prerender the "signed out" redirect into the static shell.
  await connection();
  const auth = authConfig();
  if (!auth.ok || !isDatabaseConfigured()) return null;
  try {
    return await readAdminSession(auth.config.sessionSecret);
  } catch (error) {
    unstable_rethrow(error);
    console.error("[admin] session lookup failed:", error instanceof Error ? error.message : error);
    return null;
  }
});

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export async function verifyAdminForAction(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new UnauthorizedError();
  return session;
}
