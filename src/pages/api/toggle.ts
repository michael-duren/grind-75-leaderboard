import type { APIRoute } from 'astro';
import { sql } from '../../lib/db';
import { invalidateLeaderboard } from '../../lib/queries';
import { validateSubmissionUrl } from '../../lib/validation';

export const prerender = false;

/**
 * Mark a problem solved (with a submission link as proof) or un-solve it.
 * Keeps `users.completed_at` in sync so the leaderboard can rank finishers.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { problemId?: unknown; solved?: unknown; submissionUrl?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'bad request' }, { status: 400 });
  }

  const problemId = Number(body.problemId);
  if (!Number.isInteger(problemId)) {
    return Response.json({ error: 'bad problem' }, { status: 400 });
  }

  if (body.solved) {
    const url = validateSubmissionUrl(body.submissionUrl);
    if (!url) {
      return Response.json({ error: 'invalid submission url' }, { status: 400 });
    }
    await sql`
      INSERT INTO user_problems (user_id, problem_id, submission_url)
      VALUES (${user.id}, ${problemId}, ${url})
      ON CONFLICT (user_id, problem_id)
      DO UPDATE SET submission_url = EXCLUDED.submission_url, solved_at = now()
    `;
  } else {
    await sql`
      DELETE FROM user_problems
      WHERE user_id = ${user.id} AND problem_id = ${problemId}
    `;
  }

  // Recompute completion: set completed_at on first finish, clear it if they
  // drop back below the full set.
  const [counts] = (await sql`
    SELECT
      (SELECT COUNT(*) FROM user_problems WHERE user_id = ${user.id})::int AS solved,
      (SELECT COUNT(*) FROM problems)::int AS total
  `) as Array<{ solved: number; total: number }>;

  if (counts.total > 0 && counts.solved >= counts.total) {
    await sql`UPDATE users SET completed_at = now() WHERE id = ${user.id} AND completed_at IS NULL`;
  } else {
    await sql`UPDATE users SET completed_at = NULL WHERE id = ${user.id}`;
  }

  invalidateLeaderboard();
  return Response.json({ ok: true, solved: counts.solved, total: counts.total });
};
