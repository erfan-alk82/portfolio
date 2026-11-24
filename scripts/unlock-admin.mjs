/**
 * Break-glass: clears every login throttle counter (auth_throttle), so a
 * locked-out IP, or a slowed-down global brake, starts fresh. Sessions and
 * posts are not touched.
 *
 *   npm run admin:unlock                                  # uses DATABASE_URL / .env.local
 *   docker compose run --rm migrate node scripts/unlock-admin.mjs
 */
import { connect, describeUrl } from "./db-connect.mjs";

async function main() {
  const { sql, url } = connect();
  try {
    const cleared = await sql`delete from auth_throttle returning key`;
    process.stdout.write(`Cleared ${cleared.length} login throttle ${cleared.length === 1 ? "entry" : "entries"} on ${describeUrl(url)}.\n`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  process.stderr.write(`Unlock failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
