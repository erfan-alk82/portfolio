import { describe, expect, test } from "vitest";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createSessionToken, hashSessionToken } from "@/server/auth/token";
import {
  deleteExpiredSessions,
  deleteSession,
  findActiveSession,
  insertSession,
} from "@/server/auth/session-store";

const secret = "integration-secret-that-is-at-least-32-bytes";

describe("session store", () => {
  test("a created session is found until it is revoked", async () => {
    const { token } = createSessionToken(secret);
    const idHash = hashSessionToken(token);
    const expiresAt = await insertSession(idHash, "Mozilla/5.0 test");
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + 7 * 60 * 60 * 1000);

    expect(await findActiveSession(idHash)).toEqual({ expiresAt });
    await deleteSession(idHash);
    expect(await findActiveSession(idHash)).toBeNull();
  });

  test("an expired session is not active and is purged", async () => {
    const idHash = hashSessionToken(createSessionToken(secret).token);
    await insertSession(idHash, null, -1000);
    expect(await findActiveSession(idHash)).toBeNull();
    expect(await deleteExpiredSessions()).toBe(1);
  });

  test("only the hash is stored and long user agents are truncated", async () => {
    const { token } = createSessionToken(secret);
    await insertSession(hashSessionToken(token), "x".repeat(1000));
    const rows = await getDb().execute<{ id_hash: Buffer; user_agent: string }>(sql`select id_hash, user_agent from admin_sessions`);
    expect(rows).toHaveLength(1);
    expect(rows[0].id_hash.equals(hashSessionToken(token))).toBe(true);
    expect(rows[0].id_hash.toString("utf8")).not.toContain(token);
    expect(rows[0].user_agent).toHaveLength(300);
  });
});
