import { addDays, addYears, differenceInCalendarDays, eachDayOfInterval, format, parseISO, subYears } from 'date-fns';
import type { DayStat } from '../../../lib/api';

/* Colour scale for a day's weighted score: one hue (track red), dark to
   bright as the score rises, validated as an ordinal ramp against the night
   ground (monotone lightness, visible steps, low end above 2:1). Bands follow
   the Discipline Index bands (50 solid, 80 elite) so the vocabulary matches. */
export const SCORE_STEPS = [
  { min: 1, label: '1 to 49', color: '#723326', ink: 'text-lane' },
  { min: 50, label: '50 to 79', color: '#9b3d29', ink: 'text-lane' },
  { min: 80, label: '80 to 99', color: '#c44c31', ink: 'text-lane' },
  { min: 100, label: '100', color: '#ef7f5c', ink: 'text-night-950' },
] as const;

/* Neutral greys for days that carry no score. */
export const MISSED_COLOR = '#2e343c'; // night-600: a past day with nothing done
export const OPEN_COLOR = '#22272e'; // night-700: today, nothing done yet

export type DayKind = 'past' | 'today' | 'future';

export interface SeasonDay {
  date: string;
  day: Date;
  kind: DayKind;
  /* Weighted score and completion %, null for future days or while loading. */
  score: number | null;
  completion: number | null;
}

export function stepFor(score: number): (typeof SCORE_STEPS)[number] | null {
  if (score <= 0) return null;
  for (let i = SCORE_STEPS.length - 1; i >= 0; i--) {
    if (score >= SCORE_STEPS[i].min) return SCORE_STEPS[i];
  }
  return SCORE_STEPS[0];
}

/* Fill colour for a day cell; null means "outline only" (future). */
export function fillFor(day: SeasonDay): string | null {
  if (day.kind === 'future') return null;
  const step = stepFor(day.score ?? 0);
  if (step) return step.color;
  return day.kind === 'today' ? OPEN_COLOR : MISSED_COLOR;
}

/* Text colour for a day number drawn on its fill. */
export function inkFor(day: SeasonDay): string {
  if (day.kind === 'future') return 'text-lane-mute';
  const step = stepFor(day.score ?? 0);
  if (step) return step.ink;
  return day.kind === 'today' ? 'text-lane' : 'text-lane-dim';
}

/* Plain-language description used for aria-labels and the hover readout. */
export function describeDay(day: SeasonDay): string {
  const date = format(day.day, 'EEEE, MMMM d, yyyy');
  if (day.kind === 'future') return `${date}: not reached yet`;
  if (day.score === null) return `${date}: loading`;
  const prefix = day.kind === 'today' ? `${date} (today)` : date;
  if (day.score === 0) return `${prefix}: score 0, ${day.kind === 'today' ? 'nothing done yet' : 'missed'}`;
  return `${prefix}: score ${day.score}, ${day.completion}% of habits done`;
}

/* The 12-month window: starts where the user's history starts, unless that
   is over a year ago, in which case it is the 12 months ending today (today
   is always inside the window). */
export function seasonWindow(trackingStart: Date, today: Date): { start: Date; end: Date } {
  const yearAgo = addDays(subYears(today, 1), 1);
  const start = trackingStart < yearAgo ? yearAgo : trackingStart;
  const end = addDays(addYears(start, 1), -1);
  return { start, end };
}

export function buildDays(start: Date, end: Date, todayStr: string, stats: Map<string, DayStat>): SeasonDay[] {
  return eachDayOfInterval({ start, end }).map(day => {
    const date = format(day, 'yyyy-MM-dd');
    const kind: DayKind = date === todayStr ? 'today' : date < todayStr ? 'past' : 'future';
    const stat = stats.get(date);
    return {
      date,
      day,
      kind,
      score: kind === 'future' ? null : (stat?.weighted_score ?? null),
      completion: kind === 'future' ? null : (stat?.completion_pct ?? null),
    };
  });
}

export interface SeasonSummary {
  tracked: number;
  activeDays: number;
  currentRun: number;
  longestRun: number;
  perfectDays: number;
}

/* Figures for the season so far, from the per-day stats up to today. */
export function summarize(stats: DayStat[], todayStr: string): SeasonSummary {
  const days = stats.filter(d => d.date <= todayStr).sort((a, b) => (a.date < b.date ? -1 : 1));
  let longestRun = 0;
  let run = 0;
  for (const d of days) {
    run = d.weighted_score > 0 ? run + 1 : 0;
    if (run > longestRun) longestRun = run;
  }

  // The current run survives until the end of today: if nothing is done yet
  // today, it counts back from yesterday.
  let currentRun = 0;
  let i = days.length - 1;
  if (i >= 0 && days[i].date === todayStr && days[i].weighted_score === 0) i--;
  for (; i >= 0; i--) {
    if (days[i].weighted_score > 0) currentRun++;
    else break;
  }

  return {
    tracked: days.length,
    activeDays: days.filter(d => d.weighted_score > 0).length,
    currentRun,
    longestRun,
    perfectDays: days.filter(d => d.completion_pct >= 100).length,
  };
}

export function relativeLabel(dateStr: string, todayStr: string): string {
  const diff = differenceInCalendarDays(parseISO(dateStr), parseISO(todayStr));
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return diff < 0 ? `${-diff} days ago` : `In ${diff} days`;
}
