/**
 * Consistency + interview-readiness metrics for the dashboard.
 *
 * Pure functions, no I/O — the dashboard feeds them submission timestamps and
 * solved-problem records so they can be unit-tested directly (the same pattern
 * scoring.ts follows). All windows are measured in *local* days so "days in a
 * row" lines up with what the user sees on a calendar, not UTC midnight.
 */

const DAY_MS = 86_400_000;

/** Solves within this many days count fully toward readiness. */
export const READINESS_FULL_DAYS = 30;
/** Solves older than this contribute nothing — practice has gone stale. */
export const READINESS_ZERO_DAYS = 90;
/** Trailing window used for the consistency factor in readiness. */
export const READINESS_WINDOW_DAYS = 30;

/** Integer day index for a timestamp, in the local timezone. */
export function localDayIndex(ms: number): number {
  const offset = new Date(ms).getTimezoneOffset() * 60_000;
  return Math.floor((ms - offset) / DAY_MS);
}

/** Distinct local days that saw at least one submission. */
function activeDaySet(activity: number[]): Set<number> {
  const days = new Set<number>();
  for (const ms of activity) {
    if (Number.isFinite(ms)) days.add(localDayIndex(ms));
  }
  return days;
}

/**
 * Length of the current run of consecutive active days. The streak stays
 * "alive" through today even if you haven't solved anything *yet* today, so we
 * anchor on today when it's active, otherwise yesterday. A full missed day
 * breaks it and returns 0.
 */
export function currentStreak(activity: number[], now: number): number {
  const days = activeDaySet(activity);
  if (days.size === 0) return 0;

  const today = localDayIndex(now);
  let cursor: number;
  if (days.has(today)) cursor = today;
  else if (days.has(today - 1)) cursor = today - 1;
  else return 0;

  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor--;
  }
  return streak;
}

/** Longest run of consecutive active days ever recorded. */
export function longestStreak(activity: number[]): number {
  const days = [...activeDaySet(activity)].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev = NaN;
  for (const d of days) {
    run = d === prev + 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }
  return best;
}

/**
 * Fraction (0..1) of days in the trailing `windowDays` window — ending today —
 * that had at least one submission.
 */
export function consistencyScore(activity: number[], now: number, windowDays: number): number {
  if (windowDays <= 0) return 0;
  const days = activeDaySet(activity);
  const today = localDayIndex(now);
  const oldest = today - windowDays + 1;
  let active = 0;
  for (const d of days) {
    if (d >= oldest && d <= today) active++;
  }
  return active / windowDays;
}

/**
 * Submissions-per-day for the trailing `windowDays` window, oldest first — the
 * series behind the activity sparkline.
 */
export function activitySeries(activity: number[], now: number, windowDays: number): number[] {
  const today = localDayIndex(now);
  const counts = new Array<number>(windowDays).fill(0);
  for (const ms of activity) {
    if (!Number.isFinite(ms)) continue;
    const slot = windowDays - 1 - (today - localDayIndex(ms));
    if (slot >= 0 && slot < windowDays) counts[slot]++;
  }
  return counts;
}

/**
 * How much a solve still counts toward readiness given its age in days: full
 * credit up to READINESS_FULL_DAYS, decaying linearly to zero at
 * READINESS_ZERO_DAYS.
 */
export function recencyWeight(ageDays: number): number {
  if (ageDays <= READINESS_FULL_DAYS) return 1;
  if (ageDays >= READINESS_ZERO_DAYS) return 0;
  return (READINESS_ZERO_DAYS - ageDays) / (READINESS_ZERO_DAYS - READINESS_FULL_DAYS);
}

export interface SolveRecord {
  /** ms timestamp of the most recent proof for a solved problem. */
  lastSolvedAt: number;
}

export interface Readiness {
  /** Headline score, 0..100. */
  score: number;
  /** Recency-weighted count of solves that still "count". */
  effectiveSolved: number;
  /** Problems solved at any time. */
  totalSolved: number;
  /** Consistency factor (0..1) over the readiness window. */
  consistency: number;
}

/**
 * Interview readiness = how much you've solved *recently* × how consistently
 * you're practising. Old solves decay out via recencyWeight, so a burst months
 * ago doesn't keep you "ready" forever, and a lapse in daily practice pulls the
 * score down even if your coverage is high.
 *
 * Normalised 0..100 against the full problem set: 100 means every problem
 * solved within the last month AND practice every day of the window.
 */
export function interviewReadiness(
  solves: SolveRecord[],
  totalProblems: number,
  activity: number[],
  now: number
): Readiness {
  const today = localDayIndex(now);
  let effective = 0;
  for (const s of solves) {
    if (!Number.isFinite(s.lastSolvedAt)) continue;
    effective += recencyWeight(today - localDayIndex(s.lastSolvedAt));
  }

  const consistency = consistencyScore(activity, now, READINESS_WINDOW_DAYS);
  const coverage = totalProblems > 0 ? Math.min(1, effective / totalProblems) : 0;
  const score = Math.round(coverage * consistency * 100);

  return { score, effectiveSolved: effective, totalSolved: solves.length, consistency };
}

export type ReadinessLevel = 'Warming up' | 'Building' | 'Ramping' | 'Sharp' | 'Interview-ready';

/** Qualitative label for a readiness score, so the number has meaning at a glance. */
export function readinessLevel(score: number): ReadinessLevel {
  if (score >= 80) return 'Interview-ready';
  if (score >= 60) return 'Sharp';
  if (score >= 35) return 'Ramping';
  if (score >= 15) return 'Building';
  return 'Warming up';
}
