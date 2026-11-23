import { defineConfig } from "drizzle-kit";

/**
 * Only used to generate SQL migrations from src/server/db/schema.ts:
 *   npm run db:generate -- --name <change>
 * Migrations are applied by scripts/migrate.mjs (CI, Docker, locally).
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  strict: true,
  verbose: true,
});
