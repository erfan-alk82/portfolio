/**
 * Runs the production build the same way the Docker image does: the standalone
 * server.js, with public/ and .next/static copied next to it (Next leaves those
 * to a CDN by default). `next start` is not supported with output: "standalone".
 *
 * Usage: npm run build && npm start   (PORT defaults to 3000)
 */
import { spawn } from "node:child_process";
import { cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import nextEnv from "@next/env";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");

async function main() {
  if (!existsSync(join(standalone, "server.js"))) {
    throw new Error('No standalone build found. Run "npm run build" first.');
  }
  await cp(join(root, "public"), join(standalone, "public"), { recursive: true });
  await cp(join(root, ".next", "static"), join(standalone, ".next", "static"), { recursive: true });

  // Same .env files as `next build`, so runtime-rendered pages see SITE_URL too.
  nextEnv.loadEnvConfig(root, false);
  const server = spawn(process.execPath, [join(standalone, "server.js")], {
    stdio: "inherit",
    env: { ...process.env, HOSTNAME: process.env.HOSTNAME ?? "localhost" },
  });
  const stop = (signal) => server.kill(signal);
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  server.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
