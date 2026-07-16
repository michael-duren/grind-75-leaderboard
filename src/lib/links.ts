/** Where a problem lives on each supported site. */

export function leetcodeUrl(slug: string): string {
  return `https://leetcode.com/problems/${slug}/`;
}

export function neetcodeUrl(neetcodeSlug: string): string {
  return `https://neetcode.io/problems/${neetcodeSlug}`;
}

/**
 * The link to show as primary for a problem, honoring the user's saved
 * preference. Falls back to LeetCode when NeetCode has no page for the
 * problem, regardless of preference.
 */
export function primaryProblemUrl(
  p: { slug: string; neetcodeSlug: string | null },
  preference: 'leetcode' | 'neetcode'
): string {
  if (preference === 'neetcode' && p.neetcodeSlug) return neetcodeUrl(p.neetcodeSlug);
  return leetcodeUrl(p.slug);
}
