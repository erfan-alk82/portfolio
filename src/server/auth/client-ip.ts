import "server-only";
import { createHmac } from "node:crypto";

interface ProxyEnv {
  VERCEL?: string;
  TRUST_PROXY?: string;
}

/**
 * The visitor's IP for login throttling. X-Forwarded-For is only believed
 * where something trustworthy sets it: Vercel's edge always does, and a
 * self-hosted reverse proxy does when the owner says so with TRUST_PROXY=1.
 * Otherwise any client could rotate the header to dodge the per-IP limit.
 */
export function clientIp(headers: Headers, env: ProxyEnv): string | null {
  if (env.VERCEL !== "1" && env.TRUST_PROXY !== "1") return null;
  const first = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || null;
}

export type ThrottleKind = "ip" | "global";

export interface ThrottleKey {
  kind: ThrottleKind;
  key: string;
}

/** IPs are stored as an HMAC, never in plain text. Without an IP only the global key applies. */
export function throttleKeys(ip: string | null, secret: string): ThrottleKey[] {
  const global: ThrottleKey = { kind: "global", key: "global" };
  if (!ip) return [global];
  const digest = createHmac("sha256", secret).update(`ip:${ip}`).digest("base64url");
  return [{ kind: "ip", key: `ip:${digest}` }, global];
}
