import type { Habit, HabitLog, Difficulty } from '../types';
import { format, subDays } from 'date-fns';

const DIFFICULTY_MULTIPLIERS: Record<Difficulty, number> = {
  easy: 1.0,
  medium: 1.2,
  hard: 1.5,
  extreme: 2.0,
};

/**
 * Calculate daily completion percentage.
 * Only counts logs that match currently active (non-archived) habits.
 */
export const calculateDailyCompletion = (
  habits: Habit[],
  logs: HabitLog[],
  date: string // YYYY-MM-DD
): number => {
  const activeHabits = habits.filter(h => !h.archived);
  if (activeHabits.length === 0) return 0;

  const activeHabitIds = new Set(activeHabits.map(h => h.id));
  const completedCount = logs.filter(
    l => l.date === date && l.status === 'completed' && activeHabitIds.has(l.habit_id)
  ).length;
  
  return (completedCount / activeHabits.length) * 100;
};

/**
 * Calculate weighted score for a given date.
 * Uses difficulty multipliers. Only counts active habits.
 */
export const calculateWeightedScore = (
  habits: Habit[],
  logs: HabitLog[],
  date: string
): number => {
  const activeHabits = habits.filter(h => !h.archived);
  if (activeHabits.length === 0) return 0;

  const logsForDate = logs.filter(l => l.date === date && l.status === 'completed');
  
  let potentialScore = 0;
  let earnedScore = 0;
  
  activeHabits.forEach(habit => {
    const multiplier = DIFFICULTY_MULTIPLIERS[habit.difficulty] || 1.0;
    potentialScore += multiplier;
    
    const isCompleted = logsForDate.some(l => l.habit_id === habit.id);
    if (isCompleted) {
      earnedScore += multiplier;
    }
  });
  
  if (potentialScore === 0) return 0;
  return (earnedScore / potentialScore) * 100;
};

/**
 * Calculate the Discipline Index (7-day rolling average of weighted scores).
 */
export const calculateDisciplineIndex = (
  habits: Habit[],
  logs: HabitLog[],
  endDate: string = format(new Date(), 'yyyy-MM-dd')
): number => {
  let totalScore = 0;
  const days = 7;
  
  for (let i = 0; i < days; i++) {
    const date = format(subDays(new Date(endDate), i), 'yyyy-MM-dd');
    totalScore += calculateWeightedScore(habits, logs, date);
  }
  
  return Math.round(totalScore / days);
};

/**
 * Calculate current streak for a specific habit (consecutive days completed).
 */
export const getStreak = (
  habitId: string,
  logs: HabitLog[],
  currentDate: string = format(new Date(), 'yyyy-MM-dd')
): number => {
  let streak = 0;
  const habitLogs = logs.filter(l => l.habit_id === habitId && l.status === 'completed');
  
  // Check today
  if (habitLogs.some(l => l.date === currentDate)) {
    streak++;
  }
  
  // Check consecutive days before today
  let checkDate = subDays(new Date(currentDate), 1);
  
  // If today isn't completed, check if yesterday is (streak is alive until EOD)
  if (streak === 0) {
    const yesterdayStr = format(checkDate, 'yyyy-MM-dd');
    if (habitLogs.some(l => l.date === yesterdayStr)) {
      // Don't count today, but start checking from yesterday
    } else {
      return 0; // No streak
    }
  }
  
  while (true) {
    const dateStr = format(checkDate, 'yyyy-MM-dd');
    if (habitLogs.some(l => l.date === dateStr)) {
      streak++;
      checkDate = subDays(checkDate, 1);
    } else {
      break;
    }
  }
  
  return streak;
};

/**
 * Get the actual day of week index (0=Mon, 6=Sun) for a date.
 */
export const getDayOfWeekMondayStart = (date: Date): number => {
  const day = date.getDay(); // 0=Sun, 1=Mon, ...
  return day === 0 ? 6 : day - 1; // Convert to 0=Mon, 6=Sun
};
