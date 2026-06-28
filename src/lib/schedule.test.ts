import { describe, expect, it } from 'vitest';
import {
  budgetMinutes,
  computePace,
  selectPlan,
  shownDifficulties,
  type PaceInput,
} from './schedule';

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

function input(over: Partial<PaceInput> = {}): PaceInput {
  return {
    weeks: 2,
    hoursPerWeek: 32,
    startedAt: 0,
    now: WEEK_MS, // halfway through a 2-week plan
    totalInScope: 100,
    pointsInScope: 1000,
    workloadMinutes: 60 * 60, // 60 hours of work
    solvedInScope: 50,
    ...over,
  };
}

describe('shownDifficulties', () => {
  it('keeps canonical Easy→Hard order', () => {
    expect(shownDifficulties({ showEasy: true, showMedium: false, showHard: true })).toEqual([
      'Easy',
      'Hard',
    ]);
  });

  it('returns empty when nothing is shown', () => {
    expect(shownDifficulties({ showEasy: false, showMedium: false, showHard: false })).toEqual([]);
  });
});

describe('budgetMinutes', () => {
  it('converts weeks × hours/week into minutes', () => {
    expect(budgetMinutes(2, 3)).toBe(360);
    expect(budgetMinutes(8, 10)).toBe(4800);
  });
});

describe('selectPlan', () => {
  const all = { showEasy: true, showMedium: true, showHard: true };
  // Priority order, most-essential first.
  const candidates = [
    { difficulty: 'Easy', minutes: 15 },
    { difficulty: 'Easy', minutes: 20 },
    { difficulty: 'Medium', minutes: 30 },
    { difficulty: 'Hard', minutes: 40 },
  ] as const;

  it('keeps the leading run that fits the budget, dropping the tail', () => {
    // 1 week × 1h = 60 min: 15 + 20 = 35 fits, +30 would overflow → stop.
    const plan = selectPlan(candidates, { weeks: 1, hoursPerWeek: 1, ...all });
    expect(plan.map((p) => p.minutes)).toEqual([15, 20]);
  });

  it('includes everything when the budget is ample', () => {
    const plan = selectPlan(candidates, { weeks: 10, hoursPerWeek: 10, ...all });
    expect(plan).toHaveLength(4);
  });

  it('stops at the first overflow rather than skipping ahead to a smaller one', () => {
    // 50 min budget: 15 + 20 = 35, next is 30 (overflow) → stops even though a
    // later item might individually fit. Prefix semantics keep the essentials.
    const plan = selectPlan(candidates, { weeks: 1, hoursPerWeek: 50 / 60, ...all });
    expect(plan.map((p) => p.minutes)).toEqual([15, 20]);
  });

  it('skips unshown difficulties but still fills from what remains', () => {
    // Hide Medium: budget 60 → 15 + 20 = 35, skip 30, +40 overflows → 2 kept.
    const plan = selectPlan(candidates, {
      weeks: 1,
      hoursPerWeek: 1,
      showEasy: true,
      showMedium: false,
      showHard: true,
    });
    expect(plan.map((p) => p.minutes)).toEqual([15, 20]);
  });

  it('returns nothing when no difficulties are shown', () => {
    const plan = selectPlan(candidates, {
      weeks: 10,
      hoursPerWeek: 10,
      showEasy: false,
      showMedium: false,
      showHard: false,
    });
    expect(plan).toHaveLength(0);
  });
});

describe('computePace', () => {
  it('targets the elapsed fraction of the scope', () => {
    const pace = computePace(input());
    expect(pace.elapsedFraction).toBeCloseTo(0.5);
    expect(pace.targetSolved).toBe(50);
    expect(pace.targetPoints).toBe(500);
  });

  it('reports the deadline and days remaining', () => {
    const pace = computePace(input());
    expect(pace.deadline).toBe(2 * WEEK_MS);
    expect(pace.daysRemaining).toBe(7);
    expect(pace.overdue).toBe(false);
  });

  it('flags being behind the target', () => {
    const pace = computePace(input({ solvedInScope: 30 }));
    expect(pace.onTrack).toBe(false);
    expect(pace.problemsBehind).toBe(20);
  });

  it('is on track when ahead of the target', () => {
    const pace = computePace(input({ solvedInScope: 80 }));
    expect(pace.onTrack).toBe(true);
    expect(pace.problemsBehind).toBe(0);
  });

  it('compares budgeted hours against the workload', () => {
    // 2 weeks × 32h = 64h budget vs 60h of work → feasible.
    expect(computePace(input()).feasible).toBe(true);
    // Drop the budget below the workload.
    expect(computePace(input({ hoursPerWeek: 20 })).feasible).toBe(false);
    expect(computePace(input()).budgetedHours).toBe(64);
    expect(computePace(input()).workloadHours).toBe(60);
  });

  it('clamps elapsed fraction and marks overdue past the deadline', () => {
    const pace = computePace(input({ now: 3 * WEEK_MS }));
    expect(pace.elapsedFraction).toBe(1);
    expect(pace.targetSolved).toBe(100);
    expect(pace.daysRemaining).toBe(0);
    expect(pace.overdue).toBe(true);
  });

  it('does not go negative before the plan starts', () => {
    const pace = computePace(input({ now: -WEEK_MS }));
    expect(pace.elapsedFraction).toBe(0);
    expect(pace.targetSolved).toBe(0);
  });
});
