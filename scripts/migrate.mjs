/**
 * Applies the SQL migrations in drizzle/ to DATABASE_URL, in order, once each
 * (drizzle records them in drizzle.__drizzle_migrations). Safe to run on every
 * deploy: already-applied migrations are skipped.
 *
 *   DATABASE_URL=postgres://... node scripts/migrate.mjs
 *
 * Used by the GitHub Actions production job (before `vercel deploy`), by the
 * Docker `migrate` service, and locally (it falls back to .env.local / .env).
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadLocalEnv() {
  if (process.env.DATABASE_URL) return;
  for (const file of [".env.local", ".env"]) {
    const path = join(root, file);
    if (existsSync(path)) process.loadEnvFile(path);
  }
}

function describe(url) {
  try {
    const { hostname, pathname } = new URL(url);
    return `${hostname}${pathname}`;
  } catch {
    return "(unparsable DATABASE_URL)";
  }
}

async function main() {
  loadLocalEnv();
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is required, e.g. postgres://user:password@host:5432/db");

  // One connection; prepare: false keeps it compatible with Neon's pooled endpoint.
  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 15, onnotice: () => {} });
  try {
    process.stdout.write(`Applying migrations to ${describe(url)} …\n`);
    await migrate(drizzle(sql), { migrationsFolder: join(root, "drizzle") });
    process.stdout.write("Migrations are up to date.\n");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  process.stderr.write(`Migration failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
