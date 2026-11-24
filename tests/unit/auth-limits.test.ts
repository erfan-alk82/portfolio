import { describe, expect, test } from "vitest";
import { createSemaphore } from "@/server/auth/semaphore";
import { BRAKE, brakeDelayMs } from "@/server/auth/brake";
import postgres from "postgres";
import { databaseSsl, tlsOptions } from "@/server/db/tls";

describe("createSemaphore", () => {
  test("never runs more than the limit at once and runs everything", async () => {
    const run = createSemaphore(2);
    let active = 0;
    let peak = 0;
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        run(async () => {
          active++;
          peak = Math.max(peak, active);
          await new Promise((resolve) => setTimeout(resolve, 5));
          active--;
          return i;
        }),
      ),
    );
    expect(peak).toBe(2);
    expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  test("releases its slot when the task throws", async () => {
    const run = createSemaphore(1);
    await expect(run(async () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    await expect(run(async () => "next")).resolves.toBe("next");
  });

  test("rejects new work once the queue is full instead of growing without bound", async () => {
    const run = createSemaphore(1, 1);
    let release: () => void = () => {};
    const first = run(() => new Promise<void>((resolve) => (release = resolve)));
    const queued = run(async () => "queued");
    await expect(run(async () => "overflow")).rejects.toThrow(/busy/);
    release();
    await first;
    await expect(queued).resolves.toBe("queued");
  });
});

describe("brakeDelayMs (global soft brake, never a lockout)", () => {
  test("no delay while failures stay at or below the free allowance", () => {
    expect(brakeDelayMs(0)).toBe(0);
    expect(brakeDelayMs(BRAKE.freeFailures)).toBe(0);
  });

  test("grows with each failure beyond it", () => {
    expect(brakeDelayMs(BRAKE.freeFailures + 1)).toBe(BRAKE.stepMs);
    expect(brakeDelayMs(BRAKE.freeFailures + 4)).toBe(4 * BRAKE.stepMs);
  });

  test("is capped", () => {
    expect(brakeDelayMs(10_000)).toBe(BRAKE.maxMs);
    expect(BRAKE.maxMs).toBeLessThanOrEqual(5_000);
  });
});

describe("databaseSsl", () => {
  test.each([
    "postgres://u:p@db:5432/portfolio",
    "postgres://u:p@localhost:5432/x",
    "postgres://u:p@127.0.0.1:5432/x",
    "postgres://u:p@[::1]:5432/x",
  ])("leaves local and compose hosts alone in production: %s", (url) => {
    expect(databaseSsl(url, true)).toBeUndefined();
  });

  test("requires TLS for remote hosts in production", () => {
    expect(databaseSsl("postgres://u:p@ep-x.eu-central-1.aws.neon.tech/db", true)).toBe("require");
  });

  test("respects a stricter sslmode in the URL", () => {
    expect(databaseSsl("postgres://u:p@remote.example/db?sslmode=verify-full", true)).toBeUndefined();
    expect(databaseSsl("postgres://u:p@remote.example/db?sslmode=require", true)).toBeUndefined();
  });

  test("refuses to disable TLS for a remote production database", () => {
    expect(() => databaseSsl("postgres://u:p@remote.example/db?sslmode=disable", true)).toThrow(/TLS/);
  });

  test("does not interfere outside production", () => {
    expect(databaseSsl("postgres://u:p@remote.example/db", false)).toBeUndefined();
  });
});

describe("tlsOptions as postgres.js reads them", () => {
  // postgres.js lets any `ssl` key in the options win over the URL, even `ssl: undefined`.
  const effectiveSsl = (url: string, production: boolean): unknown =>
    postgres(url, { ...tlsOptions(url, production) }).options.ssl;

  test("keeps the URL's sslmode (Neon's own connection string)", () => {
    const neon = "postgres://u:p@ep-x.eu-central-1.aws.neon.tech/db?sslmode=require&channel_binding=require";
    expect(effectiveSsl(neon, true)).toBe("require");
    expect(effectiveSsl(neon, false)).toBe("require");
    expect(effectiveSsl("postgres://u:p@remote.example/db?sslmode=verify-full", true)).toBe("verify-full");
  });

  test("forces TLS for a remote production URL without sslmode", () => {
    expect(effectiveSsl("postgres://u:p@ep-x.eu-central-1.aws.neon.tech/db", true)).toBe("require");
  });

  test("leaves the compose database on plain TCP", () => {
    expect(effectiveSsl("postgres://u:p@db:5432/portfolio", true)).toBe(false);
  });
});
