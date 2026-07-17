import type { APIRoute } from 'astro';
import { updateLinkPreference } from '../../lib/queries';
import { validateLinkPreference } from '../../lib/validation';

export const prerender = false;

/** Save which site's problem link (LeetCode or NeetCode) a user prefers as primary. */
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { preference?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'bad request' }, { status: 400 });
  }

  const preference = validateLinkPreference(body.preference);
  if (!preference) {
    return Response.json({ error: 'bad request' }, { status: 400 });
  }

  await updateLinkPreference(user.id, preference);
  return Response.json({ ok: true, preference });
};
