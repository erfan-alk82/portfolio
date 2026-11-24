import "server-only";

/** Hosts reached without leaving the machine or the Compose network. */
const LOCAL_HOSTS = new Set(["db", "localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * TLS for the database connection. In production every remote database must
 * use TLS: without an sslmode in the URL, "require" is enforced, and an
 * explicit sslmode=disable is refused. The Compose `db` service and localhost
 * are exempt. Returns undefined when the URL's own setting should stand.
 */
export function databaseSsl(url: string, production: boolean): "require" | undefined {
  if (!production) return undefined;
  const parsed = new URL(url);
  if (LOCAL_HOSTS.has(parsed.hostname)) return undefined;
  const mode = parsed.searchParams.get("sslmode");
  if (mode === "disable" || mode === "allow" || mode === "prefer") {
    throw new Error(`Refusing to connect to a remote production database without TLS (sslmode=${mode})`);
  }
  return mode ? undefined : "require";
}

/**
 * The `ssl` part of the postgres.js options. The key is left out entirely when
 * the URL should decide: postgres.js lets any `ssl` key win over the URL's
 * sslmode, so passing `ssl: undefined` would silently turn TLS off.
 */
export function tlsOptions(url: string, production: boolean): { ssl?: "require" } {
  const ssl = databaseSsl(url, production);
  return ssl ? { ssl } : {};
}
