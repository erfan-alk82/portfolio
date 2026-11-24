import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { databaseUrl, isProduction } from "../env";
import * as schema from "./schema";
import { tlsOptions } from "./tls";

/**
 * One connection pool per process, created on first use. It lives on
 * globalThis so dev hot reloads reuse it instead of leaking connections.
 * Plain PostgreSQL over DATABASE_URL: Neon on Vercel, a container in Docker.
 */

export type Database = PostgresJsDatabase<typeof schema>;

interface Pool {
  url: string;
  sql: postgres.Sql;
  db: Database;
}

const globalForDb = globalThis as typeof globalThis & { __blogDbPool?: Pool };

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not set");
    this.name = "DatabaseNotConfiguredError";
  }
}

export function isDatabaseConfigured(): boolean {
  return databaseUrl() !== null;
}

function poolSize(): number {
  const parsed = Number.parseInt(process.env.DATABASE_POOL_MAX ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 5;
}

export function getDb(): Database {
  const url = databaseUrl();
  if (!url) throw new DatabaseNotConfiguredError();
  const existing = globalForDb.__blogDbPool;
  if (existing?.url === url) return existing.db;

  const sql = postgres(url, {
    max: poolSize(),
    // Neon's pooler (PgBouncer, transaction mode) cannot keep named prepared statements.
    prepare: false,
    // TLS is mandatory for remote databases in production (see tls.ts).
    ...tlsOptions(url, isProduction()),
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
  });
  const db = drizzle(sql, { schema });
  globalForDb.__blogDbPool = { url, sql, db };
  if (existing) void existing.sql.end({ timeout: 5 });
  return db;
}

/** For scripts and tests: close the pool so the process can exit. */
export async function closeDb(): Promise<void> {
  const existing = globalForDb.__blogDbPool;
  globalForDb.__blogDbPool = undefined;
  await existing?.sql.end({ timeout: 5 });
}
