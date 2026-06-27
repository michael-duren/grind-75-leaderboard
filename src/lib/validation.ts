/** Shared input validation. Pure functions so they're unit-testable. */

export const USERNAME_RE = /^[a-zA-Z0-9_-]{3,20}$/;

export function validateUsername(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return USERNAME_RE.test(v) ? v : null;
}

export function validateLeetcodeUsername(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  // LeetCode handles are alphanumeric plus _ . - and reasonably short.
  return /^[a-zA-Z0-9_.-]{1,40}$/.test(v) ? v : null;
}

export function validatePassword(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return value.length >= 8 && value.length <= 200 ? value : null;
}

/** Whole number of weeks for a study plan (1–52). */
export function validatePlanWeeks(value: unknown): number | null {
  const n = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= 52 ? n : null;
}

/** Whole hours-per-week for a study plan (1–168, i.e. up to a full week). */
export function validateHoursPerWeek(value: unknown): number | null {
  const n = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= 168 ? n : null;
}

/** Accept only real LeetCode submission links so the "proof" means something. */
export function validateSubmissionUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  try {
    const url = new URL(v);
    const host = url.hostname.replace(/^www\./, '');
    if (host !== 'leetcode.com' && !host.endsWith('.leetcode.com')) return null;
    // Expect a problem/submission path, e.g. /problems/two-sum/submissions/12345
    if (!url.pathname.includes('/problems/')) return null;
    return v;
  } catch {
    return null;
  }
}
