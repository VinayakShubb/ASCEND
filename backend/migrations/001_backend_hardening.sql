-- ASCEND migration 001: backend hardening
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run more than once. Wrapped in a transaction, so it either fully
-- applies or changes nothing.
--
-- What it does:
--   1. Deletes every stored plaintext password and the column that held them.
--   2. Stops anyone with the public (anon) key from reading the profiles table.
--   3. Removes duplicate habit logs and prevents new ones.
--   4. Adds indexes for the queries the API runs on every request.
--   5. Creates the ai_generations table used for AI daily limits.

BEGIN;

-- 1. Plaintext passwords -------------------------------------------------
-- Supabase Auth already stores a proper hash of every password; this column
-- was an unsafe extra copy.
ALTER TABLE profiles DROP COLUMN IF EXISTS password_plain;

-- 2. Profiles readable by anyone ----------------------------------------
-- The backend reads profiles with the service-role key, which bypasses RLS,
-- so it doesn't need this policy. Users can still read their own row.
DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);

-- 3. Duplicate habit logs ------------------------------------------------
-- Keep the earliest log per (habit, day) and delete the rest. The two-column
-- ORDER BY makes the choice deterministic even when timestamps tie.
DELETE FROM habit_logs
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY habit_id, date ORDER BY timestamp, id) AS rn
    FROM habit_logs
  ) ranked
  WHERE rn > 1
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'habit_logs_habit_id_date_key'
  ) THEN
    ALTER TABLE habit_logs ADD CONSTRAINT habit_logs_habit_id_date_key UNIQUE (habit_id, date);
  END IF;
END $$;

-- 4. Indexes --------------------------------------------------------------
CREATE INDEX IF NOT EXISTS habits_user_id_created_at_idx ON habits (user_id, created_at);
CREATE INDEX IF NOT EXISTS habit_logs_user_id_date_idx ON habit_logs (user_id, date);

-- 5. AI generations -------------------------------------------------------
-- One row per successful AI generation. Only the backend (service-role key)
-- touches this table, so RLS is on with no policies: the anon key can't
-- read or write it at all.
CREATE TABLE IF NOT EXISTS ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  feature TEXT NOT NULL CHECK (feature IN ('brief', 'coach', 'cipher')),
  local_date DATE NOT NULL,
  input_hash TEXT NOT NULL,
  output JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS ai_generations_user_feature_date_idx
  ON ai_generations (user_id, feature, local_date, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_generations_user_feature_created_idx
  ON ai_generations (user_id, feature, created_at DESC);

COMMIT;
