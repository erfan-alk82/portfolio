import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Integration tests against a real PostgreSQL. They TRUNCATE every blog table,
 * so they only ever use TEST_DATABASE_URL (never DATABASE_URL):
 *   docker run -d --name blog-test-db -e POSTGRES_PASSWORD=test -p 55432:5432 postgres:18.7-alpine3.23
 *   TEST_DATABASE_URL=postgres://postgres:test@localhost:55432/postgres npm run test:integration
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/support/server-only.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/integration/global-setup.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    // One database, so test files must not run at the same time.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
