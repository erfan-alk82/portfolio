import "server-only";
import { cookies } from "next/headers";
import { isProduction } from "../env";
import { SESSION_TTL_MS, deleteExpiredSessions, deleteSession, findActiveSession, insertSession } from "./session-store";
import { createSessionToken, hashSessionToken, readSessionToken } from "./token";

/**
 * The admin session cookie. In production it uses the __Host- prefix, which
 * browsers only accept with Secure, Path=/ and no Domain, so no subdomain can
 * plant or read it. Local http development cannot set Secure cookies, hence
 * the plain name there.
 */
export function sessionCookieName(): string {
  return isProduction() ? "__Host-admin_session" : "admin_session";
}

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "strict" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function startAdminSession(secret: string, userAgent: string | null): Promise<void> {
  const { token, cookieValue } = createSessionToken(secret);
  await insertSession(hashSessionToken(token), userAgent);
  (await cookies()).set(sessionCookieName(), cookieValue, cookieOptions(SESSION_TTL_MS / 1000));
  // Housekeeping only; a failure here must not undo a successful sign-in.
  await deleteExpiredSessions().catch(() => 0);
}

/** The signed cookie must verify and its database row must exist and be unexpired. */
export async function readAdminSession(secret: string): Promise<{ expiresAt: Date } | null> {
  const token = readSessionToken((await cookies()).get(sessionCookieName())?.value, secret);
  if (!token) return null;
  return findActiveSession(hashSessionToken(token));
}

/** Revokes the session server-side (so a copied cookie stops working) and clears the cookie. */
export async function endAdminSession(secret: string): Promise<void> {
  const store = await cookies();
  const token = readSessionToken(store.get(sessionCookieName())?.value, secret);
  // Clear the cookie first, so the browser is signed out even if the database is unreachable.
  store.set(sessionCookieName(), "", cookieOptions(0));
  if (token) await deleteSession(hashSessionToken(token));
}
