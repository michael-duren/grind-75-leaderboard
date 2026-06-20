import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { sql } from './db';

const scryptAsync = promisify(scrypt);

const SCRYPT_KEYLEN = 64;
const SESSION_TTL_DAYS = 30;
export const SESSION_COOKIE = 'lb_session';

export interface SessionUser {
  id: number;
  username: string;
  leetcodeUsername: string;
}

/**
 * Hash a password with scrypt. Output format is `salt:hash` (both hex) so the
 * salt travels with the hash and we never need a second column.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

/** Verify a password against a stored `salt:hash` string in constant time. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const derived = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

/** Create a session row for a user and return the opaque cookie token. */
export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await sql`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (${token}, ${userId}, ${expires.toISOString()})
  `;
  return token;
}

/** Resolve a session token to its user, or null if missing/expired. */
export async function getSessionUser(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const rows = (await sql`
    SELECT u.id, u.username, u.leetcode_username
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token} AND s.expires_at > now()
  `) as Array<{ id: number; username: string; leetcode_username: string }>;

  const row = rows[0];
  if (!row) return null;
  return { id: row.id, username: row.username, leetcodeUsername: row.leetcode_username };
}

/** Delete a session (logout). */
export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  await sql`DELETE FROM sessions WHERE token = ${token}`;
}

/** Cookie options shared by login/logout so they stay in sync. */
export const sessionCookieOptions = {
  httpOnly: true,
  // Secure in production (HTTPS); relaxed for local http so login works under
  // `netlify dev` / `astro dev`.
  secure: import.meta.env.PROD,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
};
