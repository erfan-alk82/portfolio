import "server-only";
import { z } from "zod";
import { parsePasswordHash } from "./auth/password";

/**
 * Runtime configuration for the blog and admin. Everything is read lazily
 * inside functions, never at import time, so `next build` needs no database
 * and no secrets: the site builds and serves its static pages without them.
 */

const MIN_SECRET_BYTES = 32;

export function databaseUrl(): string | null {
  const value = process.env.DATABASE_URL?.trim();
  return value ? value : null;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

const authSchema = z.object({
  ADMIN_USERNAME: z.string().trim().min(1).max(100),
  ADMIN_PASSWORD_HASH: z
    .string()
    .trim()
    .refine((value) => parsePasswordHash(value) !== null, "must come from scripts/hash-password.mjs"),
  SESSION_SECRET: z
    .string()
    .refine((value) => Buffer.byteLength(value) >= MIN_SECRET_BYTES, `must be at least ${MIN_SECRET_BYTES} bytes`),
});

export interface AuthConfig {
  username: string;
  passwordHash: string;
  sessionSecret: string;
}

export type AuthConfigResult = { ok: true; config: AuthConfig } | { ok: false; problems: string[] };

/** Names the misconfigured variables (never their values) so the login page can say what is missing. */
export function authConfig(): AuthConfigResult {
  const result = authSchema.safeParse({
    ADMIN_USERNAME: process.env.ADMIN_USERNAME,
    ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
    SESSION_SECRET: process.env.SESSION_SECRET,
  });
  if (!result.success) {
    const problems = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
    return { ok: false, problems };
  }
  return {
    ok: true,
    config: {
      username: result.data.ADMIN_USERNAME,
      passwordHash: result.data.ADMIN_PASSWORD_HASH,
      sessionSecret: result.data.SESSION_SECRET,
    },
  };
}
