import { describe, expect, it } from 'vitest';
import {
  validateHoursPerWeek,
  validateLeetcodeUsername,
  validatePassword,
  validatePlanWeeks,
  validateSubmissionUrl,
  validateUsername,
} from './validation';

describe('validateUsername', () => {
  it('accepts valid handles and trims', () => {
    expect(validateUsername('  neo_99 ')).toBe('neo_99');
  });
  it('rejects too short / bad chars / non-strings', () => {
    expect(validateUsername('ab')).toBeNull();
    expect(validateUsername('has space')).toBeNull();
    expect(validateUsername(42)).toBeNull();
  });
});

describe('validatePassword', () => {
  it('requires at least 8 chars', () => {
    expect(validatePassword('12345678')).toBe('12345678');
    expect(validatePassword('short')).toBeNull();
  });
});

describe('validateLeetcodeUsername', () => {
  it('accepts typical leetcode handles', () => {
    expect(validateLeetcodeUsername('john.doe-1')).toBe('john.doe-1');
    expect(validateLeetcodeUsername('')).toBeNull();
  });
});

describe('validateSubmissionUrl', () => {
  it('accepts real leetcode submission links', () => {
    const url = 'https://leetcode.com/problems/valid-anagram/submissions/2039155008';
    expect(validateSubmissionUrl(url)).toBe(url);
  });
  it('rejects non-leetcode or non-problem urls', () => {
    expect(validateSubmissionUrl('https://example.com/problems/x')).toBeNull();
    expect(validateSubmissionUrl('https://leetcode.com/contest/foo')).toBeNull();
    expect(validateSubmissionUrl('not a url')).toBeNull();
  });
});

describe('validatePlanWeeks', () => {
  it('accepts whole weeks in range', () => {
    expect(validatePlanWeeks('2')).toBe(2);
    expect(validatePlanWeeks(52)).toBe(52);
  });
  it('rejects out-of-range, fractional, and non-numeric', () => {
    expect(validatePlanWeeks('0')).toBeNull();
    expect(validatePlanWeeks('53')).toBeNull();
    expect(validatePlanWeeks('1.5')).toBeNull();
    expect(validatePlanWeeks('soon')).toBeNull();
  });
});

describe('validateHoursPerWeek', () => {
  it('accepts whole hours in range', () => {
    expect(validateHoursPerWeek('32')).toBe(32);
    expect(validateHoursPerWeek(40)).toBe(40);
  });
  it('rejects out-of-range, fractional, and non-numeric', () => {
    expect(validateHoursPerWeek('0')).toBeNull();
    expect(validateHoursPerWeek('41')).toBeNull();
    expect(validateHoursPerWeek('8.5')).toBeNull();
    expect(validateHoursPerWeek('lots')).toBeNull();
  });
});
