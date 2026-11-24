import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Session cookie value: <token>.<HMAC-SHA256(secret, token)>, both base64url.
 * The signature lets the server reject forged cookies before touching the
 * database; the database only ever stores SHA-256(token), so a leaked table
 * cannot be replayed as cookies.
 */

const TOKEN_BYTES = 32;
const B64URL = /^[A-Za-z0-9_-]+$/;

export type KeyPurpose = "session-cookie" | "throttle-ip";

/**
 * One SESSION_SECRET, separate keys per use: a key that signs cookies is
 * never also used to hash IPs, so neither use can help attack the other.
 */
export function deriveKey(secret: string, purpose: KeyPurpose): Buffer {
  return createHmac("sha256", secret).update(`portfolio-admin:${purpose}`).digest();
}

function sign(token: string, secret: string): Buffer {
  return createHmac("sha256", deriveKey(secret, "session-cookie")).update(token).digest();
}

export function createSessionToken(secret: string): { token: string; cookieValue: string } {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  return { token, cookieValue: `${token}.${sign(token, secret).toString("base64url")}` };
}

/** Returns the raw token when the signature matches, otherwise null. */
export function readSessionToken(cookieValue: string | undefined, secret: string): string | null {
  if (!cookieValue) return null;
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return null;
  const [token, signature] = parts;
  if (!B64URL.test(token) || !B64URL.test(signature)) return null;
  const expected = sign(token, secret);
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return token;
}

export function hashSessionToken(token: string): Buffer {
  return createHash("sha256").update(token).digest();
}

/** Constant-time string comparison: both sides are hashed first, so lengths do not leak either. */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}
