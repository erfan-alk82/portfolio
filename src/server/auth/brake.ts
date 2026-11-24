import "server-only";

/**
 * Global soft brake. Failures across all IPs (counted per hour) slow every
 * login down a little at a time, but never lock anyone out: a flood of bad
 * guesses cannot be turned into an owner lockout.
 */
export const BRAKE = {
  /** Failures in the window before any delay. */
  freeFailures: 10,
  /** Extra delay per failure beyond that. */
  stepMs: 250,
  maxMs: 5_000,
  windowMs: 60 * 60 * 1000,
} as const;

export function brakeDelayMs(globalFailures: number): number {
  const over = globalFailures - BRAKE.freeFailures;
  return over > 0 ? Math.min(BRAKE.maxMs, over * BRAKE.stepMs) : 0;
}
