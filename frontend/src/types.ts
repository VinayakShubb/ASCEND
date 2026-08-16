export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme';

export type Frequency = 'daily' | 'weekly' | 'custom';

export type View = 'about' | 'dashboard' | 'habits' | 'calendar' | 'analytics' | 'cipher' | 'settings' | 'logic-engine';

export interface User {
  username: string; // Always SHUB
  birthday?: string;
  wake_time?: string;
  sleep_time?: string;
  future_identity?: string;
  theme: string;
  onboarding_completed: boolean;
  created_at?: string; // ISO Date string
}

export interface Habit {
  id: string;
  name: string;
  category: string;
  difficulty: Difficulty;
  frequency: Frequency;
  created_at: string; // ISO Date string
  archived: boolean;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  date: string; // YYYY-MM-DD
  status: 'completed' | 'missed' | 'skipped';
  timestamp: string; // ISO Date string
}

export interface AppState {
  user: User | null;
  habits: Habit[];
  logs: HabitLog[];
  theme: string;
}
