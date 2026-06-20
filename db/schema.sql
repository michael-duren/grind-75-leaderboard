-- Grind 75 leaderboard schema (Postgres / Netlify DB).
-- Idempotent: safe to run repeatedly. Seeded by `npm run seed`.

CREATE TABLE IF NOT EXISTS users (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username          TEXT NOT NULL UNIQUE,
  leetcode_username TEXT NOT NULL,
  password_hash     TEXT NOT NULL,
  -- Set the moment a user has solved every problem; used to order finishers.
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS problems (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  difficulty  TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  minutes     INTEGER NOT NULL,
  -- Precomputed minutes * difficulty multiplier so leaderboard sums are cheap.
  points      INTEGER NOT NULL,
  order_index INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_problems (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id        BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  problem_id     BIGINT NOT NULL REFERENCES problems (id) ON DELETE CASCADE,
  submission_url TEXT NOT NULL,
  solved_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, problem_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_problems_user_idx ON user_problems (user_id);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
