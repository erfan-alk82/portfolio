import "server-only";
import { and, gt, inArray, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { authThrottle } from "../db/schema";
import type { ThrottleKey, ThrottleKind } from "./client-ip";

/**
 * Failed-login limits. Per IP: 5 failures in 15 minutes lock that IP for 15
 * minutes. Globally: 20 failures in an hour lock the login for an hour, which
 * caps guessing from many IPs (at the cost that a sustained attack also locks
 * the owner out for that hour).
 */
export const THROTTLE_RULES: Record<ThrottleKind, { maxFailures: number; windowMs: number; lockMs: number }> = {
  ip: { maxFailures: 5, windowMs: 15 * 60 * 1000, lockMs: 15 * 60 * 1000 },
  global: { maxFailures: 20, windowMs: 60 * 60 * 1000, lockMs: 60 * 60 * 1000 },
};

const interval = (ms: number) => sql`make_interval(secs => ${ms / 1000}::double precision)`;

/** The latest lock among the given keys, or null when none is locked now. */
export async function lockedUntil(keys: readonly ThrottleKey[]): Promise<Date | null> {
  if (keys.length === 0) return null;
  const rows = await getDb()
    .select({ lockedUntil: authThrottle.lockedUntil })
    .from(authThrottle)
    .where(and(inArray(authThrottle.key, keys.map((k) => k.key)), gt(authThrottle.lockedUntil, sql`now()`)));
  const times = rows.flatMap((row) => (row.lockedUntil ? [row.lockedUntil.getTime()] : []));
  return times.length > 0 ? new Date(Math.max(...times)) : null;
}

/**
 * One atomic upsert per key: concurrent failures cannot overwrite each other's
 * count, so parallel guessing is counted exactly.
 */
async function recordFailure({ kind, key }: ThrottleKey): Promise<{ failures: number; lockedUntil: Date | null }> {
  const rule = THROTTLE_RULES[kind];
  const expired = sql`auth_throttle.window_started_at <= now() - ${interval(rule.windowMs)}`;
  const nextCount = sql`case when ${expired} then 1 else auth_throttle.failures + 1 end`;
  const rows = await getDb().execute<{ failures: number; locked_until: Date | string | null }>(sql`
    insert into auth_throttle (key, failures, window_started_at, locked_until)
    values (${key}, 1, now(), case when 1 >= ${rule.maxFailures} then now() + ${interval(rule.lockMs)} end)
    on conflict (key) do update set
      failures = ${nextCount},
      window_started_at = case when ${expired} then now() else auth_throttle.window_started_at end,
      locked_until = case
        when ${nextCount} >= ${rule.maxFailures} then now() + ${interval(rule.lockMs)}
        else auth_throttle.locked_until
      end
    returning failures, locked_until
  `);
  const [row] = rows;
  return { failures: Number(row.failures), lockedUntil: row.locked_until ? new Date(row.locked_until) : null };
}

export async function recordFailures(
  keys: readonly ThrottleKey[],
): Promise<{ failures: number; lockedUntil: Date | null }[]> {
  return Promise.all(keys.map(recordFailure));
}

/** After a successful login the IP starts fresh; the global counter keeps running. */
export async function clearFailures(keys: readonly ThrottleKey[]): Promise<void> {
  const ipKeys = keys.filter((k) => k.kind === "ip").map((k) => k.key);
  if (ipKeys.length === 0) return;
  await getDb().delete(authThrottle).where(inArray(authThrottle.key, ipKeys));
}
