"use server";

import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { loginSchema } from "@/lib/blog/schemas";
import { clientIp, throttleKeys } from "@/server/auth/client-ip";
import { verifyPassword } from "@/server/auth/password";
import { startAdminSession } from "@/server/auth/session";
import { clearFailures, lockedUntil, recordFailures } from "@/server/auth/throttle";
import { safeEqual } from "@/server/auth/token";
import { isDatabaseConfigured } from "@/server/db/client";
import { authConfig } from "@/server/env";

export interface LoginState {
  error: string | null;
  username: string;
}

/** One message for a wrong username and a wrong password alike, so neither can be probed. */
const INVALID = "That username and password do not match.";
const LOCKED = "Too many failed attempts. Wait a while, then try again.";
const UNAVAILABLE = "Signing in is not available right now. Try again in a few minutes.";

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const rawUsername = formData.get("username");
  const username = typeof rawUsername === "string" ? rawUsername.slice(0, 100) : "";
  const auth = authConfig();
  if (!auth.ok || !isDatabaseConfigured()) return { error: UNAVAILABLE, username };

  const parsed = loginSchema.safeParse({ username: rawUsername, password: formData.get("password") });
  if (!parsed.success) return { error: INVALID, username };

  const { config } = auth;
  const requestHeaders = await headers();
  const proxyEnv = { VERCEL: process.env.VERCEL, TRUST_PROXY: process.env.TRUST_PROXY };
  const keys = throttleKeys(clientIp(requestHeaders, proxyEnv), config.sessionSecret);

  try {
    if (await lockedUntil(keys)) return { error: LOCKED, username };
    // scrypt always runs, whether or not the username matches, so timing does not reveal it.
    const passwordMatches = await verifyPassword(parsed.data.password, config.passwordHash);
    const usernameMatches = safeEqual(parsed.data.username, config.username);
    if (!passwordMatches || !usernameMatches) {
      await recordFailures(keys);
      return { error: INVALID, username };
    }
    await clearFailures(keys);
    await startAdminSession(config.sessionSecret, requestHeaders.get("user-agent"));
  } catch (error) {
    unstable_rethrow(error);
    console.error("[admin] sign-in failed:", error instanceof Error ? error.message : error);
    return { error: UNAVAILABLE, username };
  }
  redirect("/admin");
}
