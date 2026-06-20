import type { APIRoute } from 'astro';
import { sql } from '../../lib/db';
import { createSession, hashPassword, SESSION_COOKIE, sessionCookieOptions } from '../../lib/auth';
import { validateLeetcodeUsername, validatePassword, validateUsername } from '../../lib/validation';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const username = validateUsername(form.get('username'));
  const leetcode = validateLeetcodeUsername(form.get('leetcode_username'));
  const password = validatePassword(form.get('password'));

  if (!username || !leetcode || !password) {
    return redirect('/register?error=invalid');
  }

  const passwordHash = await hashPassword(password);

  let userId: number;
  try {
    const rows = (await sql`
      INSERT INTO users (username, leetcode_username, password_hash)
      VALUES (${username}, ${leetcode}, ${passwordHash})
      RETURNING id
    `) as Array<{ id: number }>;
    userId = rows[0].id;
  } catch {
    // Most likely the unique-username constraint.
    return redirect('/register?error=taken');
  }

  const token = await createSession(userId);
  cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return redirect('/dashboard');
};
