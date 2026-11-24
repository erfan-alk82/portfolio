import { describe, expect, test } from "vitest";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { BRAKE } from "@/server/auth/brake";
import { throttleKeys } from "@/server/auth/client-ip";
import { attemptLogin } from "@/server/auth/login";
import { THROTTLE_RULES, clearAttempt, registerAttempt } from "@/server/auth/throttle";

const secret = "integration-secret-that-is-at-least-32-bytes";
const noSleep = async () => {};

async function row(key: string): Promise<{ failures: number; locked_until: Date | null } | undefined> {
  const rows = await getDb().execute<{ failures: number; locked_until: Date | null }>(
    sql`select failures, locked_until from auth_throttle where key = ${key}`,
  );
  return rows[0];
}

describe("attemptLogin", () => {
  test("10 concurrent wrong passwords from one IP: all counted, only the allowed ones reach scrypt", async () => {
    const keys = throttleKeys("198.51.100.4", secret);
    let verifications = 0;
    const verify = async () => {
      verifications++;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return false;
    };
    const outcomes = await Promise.all(Array.from({ length: 10 }, () => attemptLogin(keys, verify, noSleep)));

    expect(outcomes.filter((o) => o === "invalid")).toHaveLength(THROTTLE_RULES.ip.maxFailures);
    expect(outcomes.filter((o) => o === "locked")).toHaveLength(10 - THROTTLE_RULES.ip.maxFailures);
    expect(verifications).toBe(THROTTLE_RULES.ip.maxFailures);
    expect((await row(keys[0].key))?.failures).toBe(10);
    expect((await row("global"))?.failures).toBe(10);
  });

  test("a locked IP is turned away without verifying, even with the right password", async () => {
    const keys = throttleKeys("198.51.100.5", secret);
    for (let i = 0; i < THROTTLE_RULES.ip.maxFailures; i++) await attemptLogin(keys, async () => false, noSleep);
    let called = false;
    const outcome = await attemptLogin(keys, async () => ((called = true), true), noSleep);
    expect(outcome).toBe("locked");
    expect(called).toBe(false);
  });

  test("success clears the IP counter and does not count against the global brake", async () => {
    const keys = throttleKeys("198.51.100.8", secret);
    await attemptLogin(keys, async () => false, noSleep);
    expect(await attemptLogin(keys, async () => true, noSleep)).toBe("ok");
    expect(await row(keys[0].key)).toBeUndefined();
    expect((await row("global"))?.failures).toBe(1);
  });

  test("many failures across IPs slow logins down but never lock the owner out", async () => {
    for (let i = 0; i < 40; i++) await attemptLogin(throttleKeys(`203.0.113.${i}`, secret), async () => false, noSleep);
    const delays: number[] = [];
    const owner = throttleKeys("192.0.2.1", secret);
    const outcome = await attemptLogin(owner, async () => true, async (ms) => void delays.push(ms));
    expect(outcome).toBe("ok");
    expect(delays[0]).toBeGreaterThan(0);
    expect(delays[0]).toBeLessThanOrEqual(BRAKE.maxMs);
    expect((await row("global"))?.locked_until ?? null).toBeNull();
  });

  test("without a trusted IP only the global brake applies, which never locks", async () => {
    const keys = throttleKeys(null, secret);
    for (let i = 0; i < 30; i++) await attemptLogin(keys, async () => false, noSleep);
    expect(await attemptLogin(keys, async () => true, noSleep)).toBe("ok");
  });
});

describe("registerAttempt windows and housekeeping", () => {
  test("a window that has passed starts counting from one again", async () => {
    const [ipKey] = throttleKeys("198.51.100.6", secret);
    for (let i = 0; i < 3; i++) await registerAttempt([ipKey]);
    await getDb().execute(sql`update auth_throttle set window_started_at = now() - interval '1 hour' where key = ${ipKey.key}`);
    await registerAttempt([ipKey]);
    expect((await row(ipKey.key))?.failures).toBe(1);
  });

  test("an expired lock no longer blocks", async () => {
    const [ipKey] = throttleKeys("198.51.100.7", secret);
    for (let i = 0; i < THROTTLE_RULES.ip.maxFailures + 2; i++) await registerAttempt([ipKey]);
    await getDb().execute(
      sql`update auth_throttle set locked_until = now() - interval '1 second', window_started_at = now() - interval '1 hour' where key = ${ipKey.key}`,
    );
    expect((await registerAttempt([ipKey])).blocked).toBe(false);
  });

  test("stale rows are purged when attempts are registered", async () => {
    const db = getDb();
    await db.execute(
      sql`insert into auth_throttle (key, failures, window_started_at, locked_until) values ('ip:stale', 3, now() - interval '2 hours', null), ('ip:locked', 9, now() - interval '2 hours', now() + interval '5 minutes')`,
    );
    await registerAttempt(throttleKeys("198.51.100.9", secret));
    expect(await row("ip:stale")).toBeUndefined();
    expect(await row("ip:locked")).toBeDefined();
  });

  test("clearAttempt is harmless for unknown keys", async () => {
    await expect(clearAttempt(throttleKeys("198.51.100.10", secret))).resolves.toBeUndefined();
  });
});
