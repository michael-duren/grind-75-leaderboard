import { describe, expect, it } from 'vitest';
import {
  activitySeries,
  consistencyScore,
  currentStreak,
  interviewReadiness,
  longestStreak,
  readinessLevel,
  recencyWeight,
  READINESS_FULL_DAYS,
  READINESS_ZERO_DAYS,
} from './consistency';

const DAY = 86_400_000;
// A fixed "now" at local noon keeps day-boundary math away from the edges.
const NOW = new Date(2026, 5, 23, 12, 0, 0).getTime();

/** Timestamp `n` whole days before NOW (still at noon, so same local day shift). */
function daysAgo(n: number): number {
  return NOW - n * DAY;
}

describe('currentStreak', () => {
  it('is 0 with no activity', () => {
    expect(currentStreak([], NOW)).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    expect(currentStreak([daysAgo(0), daysAgo(1), daysAgo(2)], NOW)).toBe(3);
  });

  it('stays alive when today is empty but yesterday is active', () => {
    expect(currentStreak([daysAgo(1), daysAgo(2)], NOW)).toBe(2);
  });

  it('breaks after a fully missed day', () => {
    // Active 3 and 4 days ago, but nothing yesterday or today.
    expect(currentStreak([daysAgo(3), daysAgo(4)], NOW)).toBe(0);
  });

  it('collapses multiple submissions on one day into a single day', () => {
    expect(currentStreak([daysAgo(0), daysAgo(0), daysAgo(0)], NOW)).toBe(1);
  });
});

describe('longestStreak', () => {
  it('finds the longest historical run', () => {
    const activity = [
      daysAgo(20),
      daysAgo(19),
      daysAgo(18), // run of 3
      daysAgo(10),
      daysAgo(9),
      daysAgo(8),
      daysAgo(7), // run of 4
      daysAgo(1), // run of 1
    ];
    expect(longestStreak(activity)).toBe(4);
  });
});

describe('consistencyScore', () => {
  it('is the fraction of window days that were active', () => {
    const activity = [daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(3), daysAgo(4)];
    expect(consistencyScore(activity, NOW, 10)).toBeCloseTo(0.5);
  });

  it('ignores activity older than the window', () => {
    expect(consistencyScore([daysAgo(40)], NOW, 14)).toBe(0);
  });
});

describe('activitySeries', () => {
  it('places counts in trailing day slots, oldest first', () => {
    const series = activitySeries([daysAgo(0), daysAgo(0), daysAgo(2)], NOW, 3);
    // slots = [2 days ago, 1 day ago, today]
    expect(series).toEqual([1, 0, 2]);
  });
});

describe('recencyWeight', () => {
  it('gives full credit inside the full window and none past the zero window', () => {
    expect(recencyWeight(0)).toBe(1);
    expect(recencyWeight(READINESS_FULL_DAYS)).toBe(1);
    expect(recencyWeight(READINESS_ZERO_DAYS)).toBe(0);
    expect(recencyWeight(READINESS_ZERO_DAYS + 5)).toBe(0);
  });

  it('decays linearly between the two windows', () => {
    const mid = (READINESS_FULL_DAYS + READINESS_ZERO_DAYS) / 2;
    expect(recencyWeight(mid)).toBeCloseTo(0.5);
  });
});

describe('interviewReadiness', () => {
  it('rewards recent solves plus daily practice', () => {
    // 10 problems, all solved today, active every day of the 30-day window.
    const solves = Array.from({ length: 10 }, () => ({ lastSolvedAt: daysAgo(0) }));
    const activity = Array.from({ length: 30 }, (_, i) => daysAgo(i));
    const r = interviewReadiness(solves, 10, activity, NOW);
    expect(r.consistency).toBeCloseTo(1);
    expect(r.effectiveSolved).toBeCloseTo(10);
    expect(r.score).toBe(100);
  });

  it('discounts solves that happened long ago', () => {
    const solves = Array.from({ length: 10 }, () => ({ lastSolvedAt: daysAgo(120) }));
    const activity = [daysAgo(120)];
    const r = interviewReadiness(solves, 10, activity, NOW);
    expect(r.effectiveSolved).toBe(0);
    expect(r.score).toBe(0);
  });

  it('drops to zero when practice lapses even with partial coverage', () => {
    // Solved everything ~45 days ago (still partially counts), but nothing in
    // the last 30 days — practice has lapsed, so consistency is 0.
    const solves = Array.from({ length: 10 }, () => ({ lastSolvedAt: daysAgo(45) }));
    const r = interviewReadiness(solves, 10, [daysAgo(45)], NOW);
    expect(r.effectiveSolved).toBeGreaterThan(0);
    expect(r.consistency).toBe(0);
    expect(r.score).toBe(0);
  });
});

describe('readinessLevel', () => {
  it('labels score bands', () => {
    expect(readinessLevel(0)).toBe('Warming up');
    expect(readinessLevel(20)).toBe('Building');
    expect(readinessLevel(40)).toBe('Ramping');
    expect(readinessLevel(70)).toBe('Sharp');
    expect(readinessLevel(95)).toBe('Interview-ready');
  });
});
