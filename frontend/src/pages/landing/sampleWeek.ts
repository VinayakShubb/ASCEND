/* The sample week used across the landing page. Every figure shown on the
   page is computed here with the same rules as the backend
   (backend/services/calculations.py and cipher_metrics.py), so the sample
   numbers are real arithmetic, not decoration. */
import { WEIGHT_VALUE } from '../../design/habits';
import type { Difficulty } from '../../types';

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export interface SampleHabit {
  id: string;
  name: string;
  difficulty: Difficulty;
  /* Done (true) or missed (false), Monday to Sunday. */
  week: boolean[];
}

const Y = true;
const N = false;

export const SAMPLE_HABITS: SampleHabit[] = [
  { id: 'read', name: 'Read 20 pages', difficulty: 'easy', week: [Y, Y, Y, Y, Y, Y, Y] },
  { id: 'meditate', name: 'Meditate 10 min', difficulty: 'medium', week: [Y, Y, N, Y, Y, N, Y] },
  { id: 'gym', name: 'Gym', difficulty: 'hard', week: [Y, N, Y, Y, N, Y, Y] },
  { id: 'deep', name: 'Deep work 2h', difficulty: 'extreme', week: [Y, Y, N, Y, N, Y, Y] },
];

export const weightOf = (h: SampleHabit) => WEIGHT_VALUE[h.difficulty];
export const TOTAL_WEIGHT = SAMPLE_HABITS.reduce((sum, h) => sum + weightOf(h), 0);
export const MAX_WEIGHT = Math.max(...SAMPLE_HABITS.map(weightOf));

export const fmt1 = (n: number) => n.toFixed(1);

/* Daily weighted score: done weight / all weight x 100 (unrounded). */
export function dayScore(done: boolean[]): number {
  const earned = SAMPLE_HABITS.reduce((sum, h, i) => sum + (done[i] ? weightOf(h) : 0), 0);
  return (earned / TOTAL_WEIGHT) * 100;
}

export const doneOnDay = (day: number) => SAMPLE_HABITS.map((h) => h.week[day]);

/* Exact daily scores for the sample week. */
export const DAILY_EXACT = DAYS.map((_, d) => dayScore(doneOnDay(d)));

/* Discipline Index: average of the last 7 daily scores, days not run count
   as 0, rounded once at the end. */
export function disciplineIndex(scores: number[]): number {
  const total = scores.reduce((sum, s) => sum + s, 0);
  return Math.round(total / 7);
}

export const SAMPLE_DI = disciplineIndex(DAILY_EXACT);

/* "1.0 + 1.2 + 2.0" for the habits done on a day. */
export function doneWeightsText(done: boolean[]): string {
  const parts = SAMPLE_HABITS.filter((_, i) => done[i]).map((h) => fmt1(weightOf(h)));
  return parts.length ? parts.join(' + ') : '0';
}

/* What one completed day of a habit adds to the Discipline Index: its share
   of a day's weight x 100 / 7 (cipher_metrics.point_value). */
export const pointValue = (h: SampleHabit) => ((weightOf(h) / TOTAL_WEIGHT) * 100) / 7;

/* Streak as the backend counts it on `day`: alive until the end of today if
   yesterday was done. */
export function streakOn(week: boolean[], day: number, doneToday: boolean): number {
  let streak = doneToday ? 1 : 0;
  let d = day - 1;
  if (streak === 0 && !(d >= 0 && week[d])) return 0;
  while (d >= 0 && week[d]) {
    streak += 1;
    d -= 1;
  }
  return streak;
}

export function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/* CIPHER's sample sheet, built from the sample week the way
   cipher_metrics.compute_cipher_metrics builds the real one (today = Sunday,
   everything done). */
function buildCipherLines() {
  const scoresRounded = DAILY_EXACT.map((s) => Math.round(s));
  const pastSix = [0, 1, 2, 3, 4, 5];

  const lossLines = SAMPLE_HABITS.map((h) => {
    const missed = pastSix.filter((d) => !h.week[d]).map((d) => DAYS[d]);
    const pv = pointValue(h);
    return { h, missed, pv, lost: pv * missed.length };
  });
  const biggest = [...lossLines].sort((a, b) => b.lost - a.lost)[0];
  const clean = lossLines.find((l) => l.missed.length === 0);

  const worstDay = DAILY_EXACT.indexOf(Math.min(...DAILY_EXACT));
  const worstDone = SAMPLE_HABITS.filter((h) => h.week[worstDay]).map((h) => h.name);

  // Focus: the habit whose two extra days move the index most.
  const focus = SAMPLE_HABITS.map((h) => {
    const doneDays = h.week.filter(Boolean).length;
    const target = Math.min(7, Math.max(doneDays + 2, 4));
    const extra = target - doneDays;
    return { h, extra, gain: pointValue(h) * extra };
  }).sort((a, b) => b.gain - a.gain)[0];
  const diExact = DAILY_EXACT.reduce((s, x) => s + x, 0) / 7;
  const projected = Math.min(100, Math.round(diExact + focus.gain));

  return {
    scoresRounded,
    lines: [
      {
        label: 'Discipline Index',
        text: `${SAMPLE_DI}. The average of seven daily scores: ${scoresRounded.join(', ')}.`,
      },
      {
        label: 'Holding back',
        text: `${biggest.h.name} missed on ${joinNames(biggest.missed)}. Each missed day costs about ${fmt1(biggest.pv)} DI; ${biggest.missed.length} misses cost ${fmt1(biggest.lost)} DI in total.`,
      },
      {
        label: 'Weakest day',
        text: `${DAYS_FULL[worstDay]} scored ${Math.round(DAILY_EXACT[worstDay])}. Only ${joinNames(worstDone)} got done.`,
      },
      clean && {
        label: 'Working',
        text: `${clean.h.name} was done every day, so it cost nothing.`,
      },
      {
        label: 'Next week',
        text: `${focus.extra} more days of ${focus.h.name} at about ${fmt1(pointValue(focus.h))} DI each adds +${fmt1(focus.gain)}, if everything else repeats. That puts the index at ${projected}.`,
      },
    ].filter(Boolean) as { label: string; text: string }[],
  };
}

export const CIPHER_SAMPLE = buildCipherLines();
