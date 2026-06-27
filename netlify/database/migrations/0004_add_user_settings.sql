-- Per-user study plan: a schedule (weeks + hours/week) and which difficulties
-- to show on the problems view. One row per user (PK = user_id), so the plan is
-- a 1:1 extension of the users table and is dropped with the user.
--
-- `started_at` anchors the pace math; the API resets it to now() on every save,
-- so editing your plan restarts the countdown rather than leaving you instantly
-- overdue when you shorten it.

CREATE TABLE IF NOT EXISTS user_settings (
  user_id        BIGINT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  weeks          INTEGER NOT NULL DEFAULT 8 CHECK (weeks BETWEEN 1 AND 52),
  hours_per_week INTEGER NOT NULL DEFAULT 8 CHECK (hours_per_week BETWEEN 1 AND 168),
  show_easy      BOOLEAN NOT NULL DEFAULT true,
  show_medium    BOOLEAN NOT NULL DEFAULT true,
  show_hard      BOOLEAN NOT NULL DEFAULT true,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
