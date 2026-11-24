import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { deriveKey } from "./token";

interface ProxyEnv {
  VERCEL?: string;
  TRUST_PROXY?: string;
}

function validIp(value: string | null | undefined): string | null {
  const candidate = value?.trim();
  return candidate && isIP(candidate) ? candidate : null;
}

/**
 * The visitor's IP for per-IP login throttling, read only from headers a
 * trusted party sets:
 * - Vercel: x-vercel-forwarded-for (or x-real-ip), which the platform writes.
 *   The first X-Forwarded-For entry is client-controlled and is never used.
 * - Self-hosted with TRUST_PROXY=1: the right-most X-Forwarded-For entry,
 *   appended by the reverse proxy in front of the app. Anything to its left
 *   came from the client.
 * Otherwise there is no trustworthy IP, and only the global brake applies.
 */
export function clientIp(headers: Headers, env: ProxyEnv): string | null {
  if (env.VERCEL === "1") {
    return validIp(headers.get("x-vercel-forwarded-for")?.split(",")[0]) ?? validIp(headers.get("x-real-ip"));
  }
  if (env.TRUST_PROXY === "1") {
    const entries = (headers.get("x-forwarded-for") ?? "").split(",").map((entry) => entry.trim());
    return validIp(entries.at(-1));
  }
  return null;
}

export type ThrottleKind = "ip" | "global";

export interface ThrottleKey {
  kind: ThrottleKind;
  key: string;
}

/** IPs are stored as an HMAC (with an IP-only key), never in plain text. */
export function throttleKeys(ip: string | null, secret: string): ThrottleKey[] {
  const global: ThrottleKey = { kind: "global", key: "global" };
  if (!ip) return [global];
  const digest = createHmac("sha256", deriveKey(secret, "throttle-ip")).update(ip).digest("base64url");
  return [{ kind: "ip", key: `ip:${digest}` }, global];
}
