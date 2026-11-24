/**
 * Applies the SQL migrations in drizzle/ to DATABASE_URL, in order, once each
 * (drizzle records them in drizzle.__drizzle_migrations). Safe to run on every
 * deploy: already-applied migrations are skipped.
 *
 *   DATABASE_URL=postgres://... node scripts/migrate.mjs
 *
 * Used by the GitHub Actions deploy jobs (before `vercel deploy`), by the
 * Docker `migrate` service, and locally (it falls back to .env.local / .env).
 */
import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { connect, describeUrl, root } from "./db-connect.mjs";

async function main() {
  const { sql, url } = connect();
  try {
    process.stdout.write(`Applying migrations to ${describeUrl(url)} …\n`);
    await migrate(drizzle(sql), { migrationsFolder: join(root, "drizzle") });
    process.stdout.write("Migrations are up to date.\n");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("Migration failed:");

  let current = error;

  while (current) {
    console.error({
      message: current.message,
      code: current.code,
      detail: current.detail,
      hint: current.hint,
      severity: current.severity,
    });

    current = current.cause;
  }

  process.exit(1);
});
