-- Create tables for ASCEND Personal Evolution System

-- 1. Create PROFILES table (for username lookup during login)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  password_plain TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create HABITS table
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

-- 3. Create HABIT_LOGS table
CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('completed', 'missed', 'skipped', 'pending')) DEFAULT 'completed',
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;

-- 5. PROFILES policies: anyone can read (for username login lookup), only owner can insert/update
CREATE POLICY "Anyone can read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 6. HABITS policies
CREATE POLICY "Users can manage their own habits" 
  ON habits FOR ALL 
  USING (auth.uid() = user_id);

-- 7. HABIT_LOGS policies
CREATE POLICY "Users can manage their own logs" 
  ON habit_logs FOR ALL 
  USING (auth.uid() = user_id);
