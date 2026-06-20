/**
 * Scoring + ranking rules for the Grind 75 leaderboard.
 *
 * A problem is worth `minutes * difficultyMultiplier`, rewarding both the
 * expected effort (minutes) and the skill required (difficulty). These are
 * pure functions with no I/O so they can be unit-tested directly.
 */

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
};

/** Points awarded for solving a single problem. */
export function pointsFor(difficulty: Difficulty, minutes: number): number {
  return minutes * DIFFICULTY_MULTIPLIER[difficulty];
}

export interface RankableUser {
  id: number;
  username: string;
  leetcodeUsername: string;
  /** Sum of points for the problems this user has marked complete. */
  points: number;
  /** How many problems this user has completed. */
  solved: number;
  /** Timestamp (ms) the user finished ALL problems, or null if not finished. */
  completedAt: number | null;
}

export interface RankedUser extends RankableUser {
  rank: number;
  /** True once the user has solved every problem. */
  finished: boolean;
}

/**
 * Rank users for the leaderboard.
 *
 * Finishers (solved everything) always sort above non-finishers, ordered by
 * who finished first. Everyone else is ordered by points (desc). Ties break on
 * problems solved (desc) then username (asc) so the order is stable/deterministic.
 */
export function rankUsers(users: RankableUser[]): RankedUser[] {
  const sorted = [...users].sort((a, b) => {
    const aDone = a.completedAt !== null;
    const bDone = b.completedAt !== null;

    if (aDone && bDone) return a.completedAt! - b.completedAt!;
    if (aDone) return -1;
    if (bDone) return 1;

    if (b.points !== a.points) return b.points - a.points;
    if (b.solved !== a.solved) return b.solved - a.solved;
    return a.username.localeCompare(b.username);
  });

  return sorted.map((user, i) => ({
    ...user,
    rank: i + 1,
    finished: user.completedAt !== null,
  }));
}

/** Ordinal label for a rank (1 -> "1st", 2 -> "2nd", ...). */
export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
