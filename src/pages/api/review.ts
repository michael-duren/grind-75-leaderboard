import type { APIRoute } from 'astro';
import { sql } from '../../lib/db';

export const prerender = false;

/**
 * Toggle the "needs review" flag on a solved problem. Used for problems you
 * marked solved after peeking at the answer and want to come back and re-solve
 * cleanly. The flag only applies to problems already marked solved.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { problemId?: unknown; needsReview?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'bad request' }, { status: 400 });
  }

  const problemId = Number(body.problemId);
  if (!Number.isInteger(problemId)) {
    return Response.json({ error: 'bad problem' }, { status: 400 });
  }
  if (typeof body.needsReview !== 'boolean') {
    return Response.json({ error: 'bad request' }, { status: 400 });
  }

  const updated = (await sql`
    UPDATE user_problems
    SET needs_review = ${body.needsReview}
    WHERE user_id = ${user.id} AND problem_id = ${problemId}
    RETURNING id
  `) as Array<{ id: number }>;

  if (updated.length === 0) {
    return Response.json({ error: 'solve it first' }, { status: 400 });
  }

  return Response.json({ ok: true, needsReview: body.needsReview });
};
