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

function sign(token: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(token).digest();
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
