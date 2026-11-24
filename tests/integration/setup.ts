import { afterAll, beforeEach } from "vitest";
import { sql } from "drizzle-orm";

// The modules under test read DATABASE_URL; point it at the throwaway database only.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const { closeDb, getDb } = await import("@/server/db/client");

beforeEach(async () => {
  await getDb().execute(sql`truncate table post_translations, posts, admin_sessions, auth_throttle cascade`);
});

afterAll(async () => {
  await closeDb();
});
