import type { APIRoute } from 'astro';
import { sql } from '../../lib/db';
import {
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyPassword,
} from '../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const username = String(form.get('username') ?? '').trim();
  const password = String(form.get('password') ?? '');

  const rows = (await sql`
    SELECT id, password_hash FROM users WHERE username = ${username}
  `) as Array<{ id: number; password_hash: string }>;

  const user = rows[0];
  // Verify even when the user is missing to keep timing roughly constant.
  const ok = user
    ? await verifyPassword(password, user.password_hash)
    : await verifyPassword(password, 'x:y');

  if (!user || !ok) {
    return redirect('/login?error=invalid');
  }

  const token = await createSession(user.id);
  cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return redirect('/dashboard');
};
