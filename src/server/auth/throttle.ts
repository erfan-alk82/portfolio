import "server-only";
import { inArray, sql, type SQL } from "drizzle-orm";
import { getDb } from "../db/client";
import { authThrottle } from "../db/schema";
import { BRAKE } from "./brake";
import type { ThrottleKey } from "./client-ip";

/**
 * Per-IP lock: 5 attempts in 15 minutes, then that IP is turned away for 15
 * minutes. There is deliberately no global lock (it would let anyone lock the
 * owner out); the global row only feeds the soft brake in brake.ts.
 *
 * Attempts are counted BEFORE the password is checked (and un-counted on
 * success), in one atomic upsert per key, so parallel requests cannot slip
 * past the limit between "check" and "record".
 */
export const THROTTLE_RULES = {
  ip: { maxFailures: 5, windowMs: 15 * 60 * 1000, lockMs: 15 * 60 * 1000 },
} as const;

const interval = (ms: number): SQL => sql`make_interval(secs => ${ms / 1000}::double precision)`;

async function countAttempt({ kind, key }: ThrottleKey): Promise<number> {
  const windowMs = kind === "ip" ? THROTTLE_RULES.ip.windowMs : BRAKE.windowMs;
  // A window restarts only once it has passed and no lock is running.
  const reset = sql`(auth_throttle.window_started_at <= now() - ${interval(windowMs)} and (auth_throttle.locked_until is null or auth_throttle.locked_until <= now()))`;
  const next = sql`case when ${reset} then 1 else auth_throttle.failures + 1 end`;
  const lock =
    kind === "ip"
      ? sql`case when ${next} = ${THROTTLE_RULES.ip.maxFailures} then now() + ${interval(THROTTLE_RULES.ip.lockMs)} when ${reset} then null else auth_throttle.locked_until end`
      : sql`null`;
  const rows = await getDb().execute<{ failures: number }>(sql`
    insert into auth_throttle (key, failures, window_started_at, locked_until)
    values (${key}, 1, now(), null)
    on conflict (key) do update set
      failures = ${next},
      window_started_at = case when ${reset} then now() else auth_throttle.window_started_at end,
      locked_until = ${lock}
    returning failures
  `);
  return Number(rows[0].failures);
}

/** Rows whose window and lock are both over carry no information; drop them. */
async function purgeStale(): Promise<void> {
  await getDb().execute(sql`
    delete from auth_throttle
    where (locked_until is null or locked_until <= now())
      and (
        (key like 'ip:%' and window_started_at <= now() - ${interval(THROTTLE_RULES.ip.windowMs)})
        or (key = 'global' and window_started_at <= now() - ${interval(BRAKE.windowMs)})
      )
  `);
}

export interface RegisteredAttempt {
  /** The IP is over its limit: reject without checking the password. */
  blocked: boolean;
  /** Attempts across all IPs in the global window, for the soft brake. */
  globalFailures: number;
}

export async function registerAttempt(keys: readonly ThrottleKey[]): Promise<RegisteredAttempt> {
  await purgeStale();
  const counted = await Promise.all(keys.map(async (key) => ({ kind: key.kind, failures: await countAttempt(key) })));
  const ip = counted.find((c) => c.kind === "ip");
  const global = counted.find((c) => c.kind === "global");
  return {
    blocked: ip ? ip.failures > THROTTLE_RULES.ip.maxFailures : false,
    globalFailures: global?.failures ?? 0,
  };
}

/** A successful sign-in: the IP starts fresh and its attempt is taken off the global count. */
export async function clearAttempt(keys: readonly ThrottleKey[]): Promise<void> {
  const db = getDb();
  const ipKeys = keys.filter((k) => k.kind === "ip").map((k) => k.key);
  if (ipKeys.length > 0) await db.delete(authThrottle).where(inArray(authThrottle.key, ipKeys));
  if (keys.some((k) => k.kind === "global")) {
    await db.execute(sql`update auth_throttle set failures = greatest(failures - 1, 0) where key = 'global'`);
  }
}
