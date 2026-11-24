import "server-only";
import { brakeDelayMs } from "./brake";
import type { ThrottleKey } from "./client-ip";
import { createSemaphore } from "./semaphore";
import { clearAttempt, registerAttempt } from "./throttle";

export type LoginOutcome = "ok" | "invalid" | "locked";

/** Each verification is scrypt at N=2^17 (128 MiB); two at a time bounds memory. */
const verificationSlots = createSemaphore(2);

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One sign-in attempt:
 * 1. count it first (atomically), so concurrent attempts cannot exceed the limit;
 * 2. turn a locked IP away without spending a password check;
 * 3. apply the global soft brake (a delay, never a lockout);
 * 4. verify within the concurrency limit; on success un-count the attempt.
 */
export async function attemptLogin(
  keys: readonly ThrottleKey[],
  verify: () => Promise<boolean>,
  sleep: (ms: number) => Promise<void> = wait,
): Promise<LoginOutcome> {
  const attempt = await registerAttempt(keys);
  if (attempt.blocked) return "locked";
  const delay = brakeDelayMs(attempt.globalFailures);
  if (delay > 0) await sleep(delay);
  if (!(await verificationSlots(verify))) return "invalid";
  await clearAttempt(keys);
  return "ok";
}
