import "server-only";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Admin password hashes: scrypt:<log2 N>:<r>:<p>:<salt>:<hash> (base64url).
 * No "$" in the format, so the value survives .env files and Docker Compose
 * interpolation unquoted. scripts/hash-password.mjs writes the same format.
 */

const LOG_N = 17;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const SALT_BYTES = 16;
const KEY_BYTES = 64;
/** N=2^17, r=8 needs 128 MiB; Node's 32 MiB default would refuse it. */
const MAX_MEMORY = 256 * 1024 * 1024;

/** Accepted parameter bounds, so a malformed hash cannot make the server burn CPU or memory. */
const LIMITS = { logN: [14, 20], r: [1, 16], p: [1, 4] } as const;

const B64URL = /^[A-Za-z0-9_-]+$/;

export interface ParsedPasswordHash {
  logN: number;
  r: number;
  p: number;
  salt: Buffer;
  hash: Buffer;
}

function scrypt(password: string, salt: Buffer, length: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password.normalize("NFKC"), salt, length, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

function inRange(value: number, [min, max]: readonly [number, number]): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

export function parsePasswordHash(stored: string): ParsedPasswordHash | null {
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;
  const [logN, r, p] = parts.slice(1, 4).map(Number);
  const [salt, hash] = parts.slice(4);
  if (!inRange(logN, LIMITS.logN) || !inRange(r, LIMITS.r) || !inRange(p, LIMITS.p)) return null;
  if (!B64URL.test(salt) || !B64URL.test(hash)) return null;
  const saltBytes = Buffer.from(salt, "base64url");
  const hashBytes = Buffer.from(hash, "base64url");
  if (saltBytes.length < 16 || hashBytes.length < 32) return null;
  return { logN, r, p, salt: saltBytes, hash: hashBytes };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await scrypt(password, salt, KEY_BYTES, {
    N: 2 ** LOG_N,
    r: BLOCK_SIZE,
    p: PARALLELISM,
    maxmem: MAX_MEMORY,
  });
  return ["scrypt", LOG_N, BLOCK_SIZE, PARALLELISM, salt.toString("base64url"), key.toString("base64url")].join(":");
}

/** Never throws: a malformed stored hash is simply a failed match. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parsePasswordHash(stored);
  if (!parsed) return false;
  try {
    const key = await scrypt(password, parsed.salt, parsed.hash.length, {
      N: 2 ** parsed.logN,
      r: parsed.r,
      p: parsed.p,
      maxmem: MAX_MEMORY,
    });
    return timingSafeEqual(key, parsed.hash);
  } catch {
    return false;
  }
}
