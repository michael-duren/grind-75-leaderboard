-- "Needs review" flag + full submission history.
--
-- The review flag lives on the solved record (a problem is only ever flagged
-- once you've marked it solved). Submissions become an append-only log so you
-- can keep every attempt — e.g. the answer you peeked at, then your own
-- clean re-solve later.

ALTER TABLE user_problems
  ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS submissions (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id        BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  problem_id     BIGINT NOT NULL REFERENCES problems (id) ON DELETE CASCADE,
  submission_url TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS submissions_user_problem_idx
  ON submissions (user_id, problem_id);

-- Backfill history from the single link already stored on solved problems.
-- Guarded so re-running the migration can't duplicate rows.
INSERT INTO submissions (user_id, problem_id, submission_url, created_at)
SELECT up.user_id, up.problem_id, up.submission_url, up.solved_at
FROM user_problems up
WHERE NOT EXISTS (
  SELECT 1 FROM submissions s
  WHERE s.user_id = up.user_id AND s.problem_id = up.problem_id
);
