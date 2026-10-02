-- ASCEND database schema (fresh install).
--
-- This is the complete, current schema for setting up a NEW Supabase
-- project. An existing database should instead apply the files in
-- migrations/ in order; they bring it to this same state.

-- 1. PROFILES (maps a username to an email for username login)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. HABITS
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard', 'extreme')) DEFAULT 'medium',
  frequency TEXT DEFAULT 'daily',
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. HABIT_LOGS (one row per habit per completed day)
CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('completed', 'missed', 'skipped', 'pending')) DEFAULT 'completed',
  timestamp TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT habit_logs_habit_id_date_key UNIQUE (habit_id, date)
);

-- 4. AI_GENERATIONS (stored AI output, used for per-user daily limits)
CREATE TABLE IF NOT EXISTS ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  feature TEXT NOT NULL CHECK (feature IN ('brief', 'coach', 'cipher')),
  local_date DATE NOT NULL,
  input_hash TEXT NOT NULL,
  output JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS habits_user_id_created_at_idx ON habits (user_id, created_at);
CREATE INDEX IF NOT EXISTS habit_logs_user_id_date_idx ON habit_logs (user_id, date);
CREATE INDEX IF NOT EXISTS ai_generations_user_feature_date_idx
  ON ai_generations (user_id, feature, local_date, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_generations_user_feature_created_idx
  ON ai_generations (user_id, feature, created_at DESC);

-- 6. Row Level Security
-- The backend uses the service-role key (which bypasses RLS) and enforces
-- ownership itself. These policies are defence in depth: they make sure the
-- public anon key can only ever reach a signed-in user's own rows.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;  -- no policies: backend only

CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage their own habits"
  ON habits FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own logs"
  ON habit_logs FOR ALL
  USING (auth.uid() = user_id);
