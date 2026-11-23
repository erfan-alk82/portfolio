import { describe, expect, test } from "vitest";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { throttleKeys } from "@/server/auth/client-ip";
import { createSessionToken, hashSessionToken } from "@/server/auth/token";
import {
  deleteExpiredSessions,
  deleteSession,
  findActiveSession,
  insertSession,
} from "@/server/auth/session-store";
import { THROTTLE_RULES, clearFailures, lockedUntil, recordFailures } from "@/server/auth/throttle";

const secret = "integration-secret-that-is-at-least-32-bytes";

describe("login throttle", () => {
  test("10 concurrent failures from one IP are all counted and lock it", async () => {
    const [ipKey] = throttleKeys("198.51.100.4", secret);
    const results = await Promise.all(Array.from({ length: 10 }, () => recordFailures([ipKey])));
    const counts = results.map((r) => r[0].failures).sort((a, b) => a - b);
    expect(counts).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const until = await lockedUntil([ipKey]);
    expect(until).toBeInstanceOf(Date);
    expect(until!.getTime()).toBeGreaterThan(Date.now() + THROTTLE_RULES.ip.lockMs - 60_000);
  });

  test("an IP stays unlocked below its limit", async () => {
    const [ipKey] = throttleKeys("198.51.100.5", secret);
    for (let i = 0; i < THROTTLE_RULES.ip.maxFailures - 1; i++) await recordFailures([ipKey]);
    expect(await lockedUntil([ipKey])).toBeNull();
    await recordFailures([ipKey]);
    expect(await lockedUntil([ipKey])).not.toBeNull();
  });

  test("the global key locks after its own, higher limit", async () => {
    const keys = Array.from({ length: THROTTLE_RULES.global.maxFailures }, (_, i) => throttleKeys(`203.0.113.${i}`, secret));
    for (const pair of keys) await recordFailures(pair);
    const global = keys[0][1];
    expect(global.kind).toBe("global");
    expect(await lockedUntil([global])).not.toBeNull();
  });

  test("a window that has passed starts counting from one again", async () => {
    const [ipKey] = throttleKeys("198.51.100.6", secret);
    for (let i = 0; i < 3; i++) await recordFailures([ipKey]);
    await getDb().execute(sql`update auth_throttle set window_started_at = now() - interval '1 hour' where key = ${ipKey.key}`);
    const [after] = await recordFailures([ipKey]);
    expect(after.failures).toBe(1);
  });

  test("an expired lock no longer blocks", async () => {
    const [ipKey] = throttleKeys("198.51.100.7", secret);
    for (let i = 0; i < THROTTLE_RULES.ip.maxFailures; i++) await recordFailures([ipKey]);
    await getDb().execute(sql`update auth_throttle set locked_until = now() - interval '1 second' where key = ${ipKey.key}`);
    expect(await lockedUntil([ipKey])).toBeNull();
  });

  test("a successful login clears the IP counter but not the global one", async () => {
    const keys = throttleKeys("198.51.100.8", secret);
    await recordFailures(keys);
    await clearFailures(keys);
    const rows = await getDb().execute<{ key: string }>(sql`select key from auth_throttle order by key`);
    expect(rows.map((r) => r.key)).toEqual(["global"]);
  });
});

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
