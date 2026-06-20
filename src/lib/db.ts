import { getDatabase, type DatabaseConnection } from '@netlify/database';

/**
 * SQL client backed by Netlify DB. `getDatabase()` reads the connection from
 * NETLIFY_DATABASE_URL (injected automatically by `netlify dev` and in
 * production), so there's no connection string to manage.
 *
 * The connection is created lazily on first query so importing this module at
 * build time — when the env var isn't present — doesn't throw.
 *
 * Use as a tagged template; interpolated values are sent as bound parameters:
 *   const rows = await sql`SELECT * FROM users WHERE id = ${id}`;
 */
let connection: DatabaseConnection | undefined;

function conn(): DatabaseConnection {
  connection ??= getDatabase();
  return connection;
}

export function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  const run = conn().sql as unknown as (
    s: TemplateStringsArray,
    ...v: unknown[]
  ) => Promise<unknown[]>;
  return run(strings, ...values);
}
