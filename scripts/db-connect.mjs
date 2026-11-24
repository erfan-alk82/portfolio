/**
 * Shared by scripts/migrate.mjs and scripts/unlock-admin.mjs: reads
 * DATABASE_URL (falling back to .env.local / .env) and opens one connection.
 *
 * TLS: any host other than localhost or the Compose `db` service must use TLS.
 * Without an sslmode in the URL "require" is enforced; sslmode=disable is
 * refused (the same rule as src/server/db/tls.ts applies to the app).
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const LOCAL_HOSTS = new Set(["db", "localhost", "127.0.0.1", "::1", "[::1]"]);

function loadLocalEnv() {
  if (process.env.DATABASE_URL) return;
  for (const file of [".env.local", ".env"]) {
    const path = join(root, file);
    if (existsSync(path)) process.loadEnvFile(path);
  }
}

function sslFor(url) {
  const parsed = new URL(url);
  if (LOCAL_HOSTS.has(parsed.hostname)) return undefined;
  const mode = parsed.searchParams.get("sslmode");
  if (mode === "disable" || mode === "allow" || mode === "prefer") {
    throw new Error(`Refusing to connect to remote host ${parsed.hostname} without TLS (sslmode=${mode})`);
  }
  return mode ? undefined : "require";
}

export function describeUrl(url) {
  try {
    const { hostname, pathname } = new URL(url);
    return `${hostname}${pathname}`;
  } catch {
    return "(unparsable DATABASE_URL)";
  }
}

/** One connection; prepare: false keeps it compatible with Neon's pooled endpoint. */
export function connect() {
  loadLocalEnv();
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is required, e.g. postgres://user:password@host:5432/db");
  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 15, ssl: sslFor(url), onnotice: () => {} });
  return { sql, url };
}
