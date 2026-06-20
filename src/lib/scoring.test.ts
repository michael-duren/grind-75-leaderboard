import { describe, expect, it } from 'vitest';
import { ordinal, pointsFor, rankUsers, type RankableUser } from './scoring';

describe('pointsFor', () => {
  it('weights minutes by difficulty multiplier', () => {
    expect(pointsFor('Easy', 15)).toBe(15);
    expect(pointsFor('Medium', 30)).toBe(60);
    expect(pointsFor('Hard', 40)).toBe(120);
  });
});

describe('ordinal', () => {
  it('formats common ordinals', () => {
    expect(ordinal(1)).toBe('1st');
    expect(ordinal(2)).toBe('2nd');
    expect(ordinal(3)).toBe('3rd');
    expect(ordinal(4)).toBe('4th');
  });

  it('handles the 11-13 special case', () => {
    expect(ordinal(11)).toBe('11th');
    expect(ordinal(12)).toBe('12th');
    expect(ordinal(13)).toBe('13th');
    expect(ordinal(21)).toBe('21st');
  });
});

function user(partial: Partial<RankableUser> & { id: number; username: string }): RankableUser {
  return {
    leetcodeUsername: partial.username,
    points: 0,
    solved: 0,
    completedAt: null,
    ...partial,
  };
}

describe('rankUsers', () => {
  it('ranks by points descending when nobody has finished', () => {
    const ranked = rankUsers([
      user({ id: 1, username: 'alice', points: 100, solved: 5 }),
      user({ id: 2, username: 'bob', points: 250, solved: 10 }),
      user({ id: 3, username: 'cara', points: 60, solved: 3 }),
    ]);
    expect(ranked.map((u) => u.username)).toEqual(['bob', 'alice', 'cara']);
    expect(ranked.map((u) => u.rank)).toEqual([1, 2, 3]);
  });

  it('places finishers above everyone, ordered by finish time', () => {
    const ranked = rankUsers([
      user({ id: 1, username: 'alice', points: 9999, solved: 200 }),
      user({ id: 2, username: 'bob', points: 9275, solved: 168, completedAt: 2000 }),
      user({ id: 3, username: 'cara', points: 9275, solved: 168, completedAt: 1000 }),
    ]);
    expect(ranked.map((u) => u.username)).toEqual(['cara', 'bob', 'alice']);
    expect(ranked[0].finished).toBe(true);
    expect(ranked[2].finished).toBe(false);
  });

  it('breaks point ties by solved count then username', () => {
    const ranked = rankUsers([
      user({ id: 1, username: 'zoe', points: 100, solved: 4 }),
      user({ id: 2, username: 'amy', points: 100, solved: 4 }),
      user({ id: 3, username: 'max', points: 100, solved: 6 }),
    ]);
    expect(ranked.map((u) => u.username)).toEqual(['max', 'amy', 'zoe']);
  });
});
