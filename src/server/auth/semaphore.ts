import "server-only";

/**
 * A small in-process limiter. scrypt with N=2^17 needs 128 MiB per call, so
 * login verifications run at most `limit` at a time; extra callers wait in a
 * bounded queue, and beyond that they are turned away instead of piling up.
 */
export function createSemaphore(limit: number, maxQueue = 50) {
  let active = 0;
  const waiting: (() => void)[] = [];

  function release(): void {
    active--;
    waiting.shift()?.();
  }

  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= limit) {
      if (waiting.length >= maxQueue) throw new Error("Server busy: too many sign-in attempts in progress");
      await new Promise<void>((resolve) => waiting.push(resolve));
    }
    active++;
    try {
      return await task();
    } finally {
      release();
    }
  };
}
