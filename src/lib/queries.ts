import { sql } from './db';
import { rankUsers, type RankableUser, type RankedUser, type Difficulty } from './scoring';

/**
 * Tiny in-process cache. The leaderboard is read on every homepage hit but
 * changes rarely, so a short TTL avoids hammering the DB without adding infra.
 * (Serverless functions are short-lived, so this is best-effort per instance —
 * exactly what the "low traffic, don't over-engineer" brief calls for.)
 */
const CACHE_TTL_MS = 15_000;
const cache = new Map<string, { value: unknown; expires: number }>();

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await load();
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
  return value;
}

/** Drop cached leaderboard data after a write (e.g. a problem toggle). */
export function invalidateLeaderboard(): void {
  cache.delete('leaderboard');
}

export interface LeaderboardData {
  users: RankedUser[];
  totalProblems: number;
  totalPoints: number;
}

export async function getLeaderboard(): Promise<LeaderboardData> {
  return cached('leaderboard', async () => {
    const [totals] = (await sql`
      SELECT COUNT(*)::int AS total_problems,
             COALESCE(SUM(points), 0)::int AS total_points
      FROM problems
    `) as Array<{ total_problems: number; total_points: number }>;

    const rows = (await sql`
      SELECT u.id,
             u.username,
             u.leetcode_username,
             COALESCE(SUM(p.points), 0)::int AS points,
             COUNT(up.id)::int AS solved,
             u.completed_at
      FROM users u
      LEFT JOIN user_problems up ON up.user_id = u.id
      LEFT JOIN problems p ON p.id = up.problem_id
      GROUP BY u.id
    `) as Array<{
      id: number;
      username: string;
      leetcode_username: string;
      points: number;
      solved: number;
      completed_at: string | null;
    }>;

    const users: RankableUser[] = rows.map((r) => ({
      id: r.id,
      username: r.username,
      leetcodeUsername: r.leetcode_username,
      points: r.points,
      solved: r.solved,
      completedAt: r.completed_at ? Date.parse(r.completed_at) : null,
    }));

    return {
      users: rankUsers(users),
      totalProblems: totals?.total_problems ?? 0,
      totalPoints: totals?.total_points ?? 0,
    };
  });
}

export interface SubmissionEntry {
  url: string;
  createdAt: string;
}

export interface ProblemRow {
  id: number;
  slug: string;
  title: string;
  difficulty: Difficulty;
  minutes: number;
  points: number;
  orderIndex: number;
  solved: boolean;
  submissionUrl: string | null;
  needsReview: boolean;
  /** Every submission logged for this problem, newest first. */
  submissions: SubmissionEntry[];
}

/** All problems with this user's solve status, ordered for the dashboard grid. */
export async function getProblemsForUser(userId: number): Promise<ProblemRow[]> {
  const rows = (await sql`
    SELECT p.id,
           p.slug,
           p.title,
           p.difficulty,
           p.minutes,
           p.points,
           p.order_index,
           up.submission_url,
           COALESCE(up.needs_review, false) AS needs_review
    FROM problems p
    LEFT JOIN user_problems up
      ON up.problem_id = p.id AND up.user_id = ${userId}
    ORDER BY p.order_index
  `) as Array<{
    id: number;
    slug: string;
    title: string;
    difficulty: Difficulty;
    minutes: number;
    points: number;
    order_index: number;
    submission_url: string | null;
    needs_review: boolean;
  }>;

  const subRows = (await sql`
    SELECT problem_id, submission_url, created_at
    FROM submissions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `) as Array<{ problem_id: number; submission_url: string; created_at: string }>;

  const byProblem = new Map<number, SubmissionEntry[]>();
  for (const s of subRows) {
    const list = byProblem.get(s.problem_id) ?? [];
    list.push({ url: s.submission_url, createdAt: s.created_at });
    byProblem.set(s.problem_id, list);
  }

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    difficulty: r.difficulty,
    minutes: r.minutes,
    points: r.points,
    orderIndex: r.order_index,
    solved: r.submission_url !== null,
    submissionUrl: r.submission_url,
    needsReview: r.needs_review,
    submissions: byProblem.get(r.id) ?? [],
  }));
}

export interface SolvedProblem {
  title: string;
  slug: string;
  difficulty: Difficulty;
  points: number;
  submissionUrl: string;
  solvedAt: string;
}

export interface UserProfile {
  username: string;
  leetcodeUsername: string;
  completedAt: number | null;
  createdAt: string;
  solved: SolvedProblem[];
}

/** Public profile: a user plus every problem they've solved (with proof links). */
export async function getUserProfile(username: string): Promise<UserProfile | null> {
  const userRows = (await sql`
    SELECT id, username, leetcode_username, completed_at, created_at
    FROM users
    WHERE lower(username) = lower(${username})
  `) as Array<{
    id: number;
    username: string;
    leetcode_username: string;
    completed_at: string | null;
    created_at: string;
  }>;

  const user = userRows[0];
  if (!user) return null;

  const solvedRows = (await sql`
    SELECT p.title, p.slug, p.difficulty, p.points, up.submission_url, up.solved_at
    FROM user_problems up
    JOIN problems p ON p.id = up.problem_id
    WHERE up.user_id = ${user.id}
    ORDER BY up.solved_at DESC
  `) as Array<{
    title: string;
    slug: string;
    difficulty: Difficulty;
    points: number;
    submission_url: string;
    solved_at: string;
  }>;

  return {
    username: user.username,
    leetcodeUsername: user.leetcode_username,
    completedAt: user.completed_at ? Date.parse(user.completed_at) : null,
    createdAt: user.created_at,
    solved: solvedRows.map((r) => ({
      title: r.title,
      slug: r.slug,
      difficulty: r.difficulty,
      points: r.points,
      submissionUrl: r.submission_url,
      solvedAt: r.solved_at,
    })),
  };
}
