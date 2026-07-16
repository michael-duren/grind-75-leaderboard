-- Per-user preference for which site's problem link to show as primary
-- (LeetCode or NeetCode). Defaults to 'leetcode' to match the currently
-- deployed behavior, so existing users see no change until they opt in.

ALTER TABLE users
  ADD COLUMN link_preference TEXT NOT NULL DEFAULT 'leetcode'
    CHECK (link_preference IN ('leetcode', 'neetcode'));
