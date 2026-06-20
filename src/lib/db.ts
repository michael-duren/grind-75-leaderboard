import { neon } from '@netlify/neon';

/**
 * Neon (Netlify DB) SQL client. Reads the connection string from
 * NETLIFY_DATABASE_URL automatically. Use as a tagged template:
 *
 *   const rows = await sql`SELECT * FROM users WHERE id = ${id}`;
 *
 * Values interpolated into the template are sent as parameters, not string
 * concatenation, so this is safe against SQL injection.
 */
export const sql = neon();
