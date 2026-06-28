/**
 * Study-plan pacing for the dashboard.
 *
 * A plan is "finish the problems I care about in `weeks` weeks, budgeting
 * `hoursPerWeek` hours a week". From that, plus how far into the plan we are, we
 * derive a target — how many problems / points you *should* have done by now —
 * and whether the time budgeted is even enough for the workload.
 *
 * Pure functions, no I/O (same pattern as scoring.ts / consistency.ts) so the
 * dashboard feeds in counts + timestamps and these stay unit-testable.
 */

import type { Difficulty } from './scoring';

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

/**
 * Sensible defaults for a brand-new plan. 8 × 10 = 80h budget, comfortably above
 * the ~76h of all problems, so a fresh plan includes the whole set by default.
 */
export const DEFAULT_WEEKS = 8;
export const DEFAULT_HOURS_PER_WEEK = 10;

export interface UserSettings {
  weeks: number;
  hoursPerWeek: number;
  showEasy: boolean;
  showMedium: boolean;
  showHard: boolean;
  /** ms timestamp the current plan started from — the pace anchor. */
  startedAt: number;
}

/** Difficulties the user has chosen to show, in canonical Easy→Hard order. */
export function shownDifficulties(s: {
  showEasy: boolean;
  showMedium: boolean;
  showHard: boolean;
}): Difficulty[] {
  const out: Difficulty[] = [];
  if (s.showEasy) out.push('Easy');
  if (s.showMedium) out.push('Medium');
  if (s.showHard) out.push('Hard');
  return out;
}

/** Total study minutes a plan budgets. */
export function budgetMinutes(weeks: number, hoursPerWeek: number): number {
  return weeks * hoursPerWeek * 60;
}

export interface PlanCandidate {
  difficulty: Difficulty;
  minutes: number;
}

/**
 * Pick the problems a plan includes. Walk the candidates in priority order (the
 * caller pre-sorts most-essential first), keep each one whose difficulty is
 * shown while the running time stays within budget, and stop at the first that
 * would overflow — i.e. drop the least-essential tail until the rest fit. More
 * weeks/hours → more kept; fewer → it shrinks toward the essential core.
 */
export function selectPlan<T extends PlanCandidate>(
  ordered: readonly T[],
  settings: {
    weeks: number;
    hoursPerWeek: number;
    showEasy: boolean;
    showMedium: boolean;
    showHard: boolean;
  }
): T[] {
  const shown = new Set(shownDifficulties(settings));
  const budget = budgetMinutes(settings.weeks, settings.hoursPerWeek);
  const out: T[] = [];
  let used = 0;
  for (const c of ordered) {
    if (!shown.has(c.difficulty)) continue;
    if (used + c.minutes > budget) break;
    used += c.minutes;
    out.push(c);
  }
  return out;
}

export interface PaceInput {
  weeks: number;
  hoursPerWeek: number;
  /** ms — when the plan started. */
  startedAt: number;
  /** ms — current time, fixed once on the server. */
  now: number;
  /** Problems within the chosen difficulties. */
  totalInScope: number;
  pointsInScope: number;
  /** Sum of estimated minutes across in-scope problems. */
  workloadMinutes: number;
  solvedInScope: number;
}

export interface Pace {
  /** ms timestamp the plan is due. */
  deadline: number;
  /** Whole days left until the deadline (0 once reached). */
  daysRemaining: number;
  overdue: boolean;
  /** weeks × hoursPerWeek. */
  budgetedHours: number;
  /** Estimated hours of work across in-scope problems. */
  workloadHours: number;
  /** Whether the budgeted hours cover the estimated workload. */
  feasible: boolean;
  /** How far through the plan window we are, 0..1. */
  elapsedFraction: number;
  /** Problems / points you should have done by now to stay on pace. */
  targetSolved: number;
  targetPoints: number;
  /** Solves you're short of the target (0 when on track). */
  problemsBehind: number;
  onTrack: boolean;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Derive the on-track target and feasibility for a plan at a point in time. */
export function computePace(input: PaceInput): Pace {
  const planMs = input.weeks * WEEK_MS;
  const deadline = input.startedAt + planMs;
  const elapsedFraction = planMs > 0 ? clamp((input.now - input.startedAt) / planMs, 0, 1) : 1;

  const targetSolved = Math.round(elapsedFraction * input.totalInScope);
  const targetPoints = Math.round(elapsedFraction * input.pointsInScope);
  const problemsBehind = Math.max(0, targetSolved - input.solvedInScope);

  const budgetedHours = input.weeks * input.hoursPerWeek;
  const workloadHours = input.workloadMinutes / 60;
  const msLeft = deadline - input.now;

  return {
    deadline,
    daysRemaining: Math.max(0, Math.ceil(msLeft / DAY_MS)),
    overdue: msLeft < 0,
    budgetedHours,
    workloadHours,
    feasible: budgetedHours >= workloadHours,
    elapsedFraction,
    targetSolved,
    targetPoints,
    problemsBehind,
    onTrack: input.solvedInScope >= targetSolved,
  };
}
