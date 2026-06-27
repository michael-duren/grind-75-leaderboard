import { describe, expect, it } from 'vitest';
import { computePace, shownDifficulties, type PaceInput } from './schedule';

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
