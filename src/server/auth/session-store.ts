import "server-only";
import { and, eq, gt, lte, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { adminSessions } from "../db/schema";

/** Admin sessions last 8 hours; the cookie's Max-Age matches. */
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const USER_AGENT_MAX = 300;

/** Expiry is computed by the database clock, the same clock that checks it. */
export async function insertSession(idHash: Buffer, userAgent: string | null, ttlMs = SESSION_TTL_MS): Promise<Date> {
  const [row] = await getDb()
    .insert(adminSessions)
    .values({
      idHash,
      userAgent: userAgent ? userAgent.slice(0, USER_AGENT_MAX) : null,
      expiresAt: sql`now() + make_interval(secs => ${ttlMs / 1000}::double precision)`,
    })
    .returning({ expiresAt: adminSessions.expiresAt });
  return row.expiresAt;
}

export async function findActiveSession(idHash: Buffer): Promise<{ expiresAt: Date } | null> {
  const [row] = await getDb()
    .select({ expiresAt: adminSessions.expiresAt })
    .from(adminSessions)
    .where(and(eq(adminSessions.idHash, idHash), gt(adminSessions.expiresAt, sql`now()`)));
  return row ?? null;
}

export async function deleteSession(idHash: Buffer): Promise<void> {
  await getDb().delete(adminSessions).where(eq(adminSessions.idHash, idHash));
}

/** Housekeeping, run on each login. Returns how many rows were removed. */
export async function deleteExpiredSessions(): Promise<number> {
  const deleted = await getDb()
    .delete(adminSessions)
    .where(lte(adminSessions.expiresAt, sql`now()`))
    .returning({ expiresAt: adminSessions.expiresAt });
  return deleted.length;
}
