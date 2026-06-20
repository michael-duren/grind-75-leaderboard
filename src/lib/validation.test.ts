import { describe, expect, it } from 'vitest';
import {
  validateLeetcodeUsername,
  validatePassword,
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
