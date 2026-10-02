import { addDays, format, parseISO } from 'date-fns';
import type { Habit, HabitLog } from '../../../types';

export type MarkState = 'done' | 'missed' | 'open' | 'before';

export interface HabitInsight {
  habit: Habit;
  done7: number;
  days7: number;
  done30: number;
  days30: number;
  streak: number;
  total: number;
  week: { date: string; letter: string; dayName: string; state: MarkState }[];
}

export function rate(done: number, days: number): number | null {
  return days > 0 ? Math.round((done / days) * 100) : null;
}

/* Per-habit figures from the logs already loaded.
   A habit's history starts at the earlier of its creation and its first
   completed log (history can predate the habit record). Days before that
   are left out of its rates, and today only counts once it is done, so a
   habit is never marked down for a day that is still open. */
export function habitInsights(
  habits: Habit[],
  logs: HabitLog[],
  streaks: Record<string, number>,
  todayStr: string,
): HabitInsight[] {
  const today = parseISO(todayStr);
  const doneByHabit = new Map<string, Set<string>>();
  for (const log of logs) {
    if (log.status !== 'completed') continue;
    let set = doneByHabit.get(log.habit_id);
    if (!set) doneByHabit.set(log.habit_id, (set = new Set()));
    set.add(log.date);
  }

  return habits.map(habit => {
    const done = doneByHabit.get(habit.id) ?? new Set<string>();
    let start = habit.created_at ? habit.created_at.slice(0, 10) : todayStr;
    for (const d of done) if (d < start) start = d;

    const count = (span: number) => {
      let doneCount = 0;
      let days = 0;
      for (let i = 0; i < span; i++) {
        const date = format(addDays(today, -i), 'yyyy-MM-dd');
        if (date < start) break;
        const isDone = done.has(date);
        if (date === todayStr && !isDone) continue;
        days++;
        if (isDone) doneCount++;
      }
      return { doneCount, days };
    };

    const w = count(7);
    const m = count(30);

    const week = Array.from({ length: 7 }, (_, k) => {
      const day = addDays(today, k - 6);
      const date = format(day, 'yyyy-MM-dd');
      const state: MarkState = done.has(date)
        ? 'done'
        : date < start
          ? 'before'
          : date === todayStr
            ? 'open'
            : 'missed';
      return { date, letter: format(day, 'EEEEE'), dayName: format(day, 'EEEE'), state };
    });

    return {
      habit,
      done7: w.doneCount,
      days7: w.days,
      done30: m.doneCount,
      days30: m.days,
      streak: streaks[habit.id] ?? 0,
      total: done.size,
      week,
    };
  });
}
