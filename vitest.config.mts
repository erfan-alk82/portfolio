import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/support/server-only.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    environment: "node",
    coverage: {
      // Database-backed modules (src/server/db, blog, session, throttle) are covered by
      // the integration suite against a real PostgreSQL (vitest.integration.config.mts).
      include: [
        "src/lib/**",
        "src/i18n/**",
        "src/content/**",
        "src/components/blog/MarkdownBody.tsx",
        "src/server/auth/password.ts",
        "src/server/auth/token.ts",
        "src/server/auth/client-ip.ts",
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
