import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { LaneRow } from '../../../components/app/LaneRow';
import { useData } from '../../../context/DataContext';
import type { Habit } from '../../../types';
import { relativeLabel, type SeasonDay } from './season';

interface DayPanelProps {
  day: SeasonDay;
  todayStr: string;
  habits: Habit[];
  /* Called after a toggle has reached the server, so scores can refetch. */
  onChanged: () => void;
}

/* The selected day: its score, its completion, and its habits as lanes so a
   past day can be corrected. Future days are shown but locked. */
export function DayPanel({ day, todayStr, habits, onChanged }: DayPanelProps) {
  const { toggleHabitCompletion, getHabitStatus } = useData();
  const [pending, setPending] = useState<Set<string>>(() => new Set());
  const isFuture = day.kind === 'future';
  const doneCount = habits.filter(h => getHabitStatus(h.id, day.date) === 'completed').length;

  const toggle = async (habitId: string) => {
    setPending(prev => new Set(prev).add(habitId));
    try {
      await toggleHabitCompletion(habitId, day.date);
    } finally {
      setPending(prev => {
        const next = new Set(prev);
        next.delete(habitId);
        return next;
      });
      onChanged();
    }
  };

  const note = isFuture
    ? 'This day has not come yet. You can check habits off once it arrives.'
    : day.kind === 'today'
      ? 'This is today. Checking a habit here is the same as checking it on Today.'
      : 'Tap a habit to correct this day. Scores update as soon as the change is saved.';

  return (
    <section aria-labelledby="day-panel-title">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-lane-line-strong pb-5">
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-lane-dim">{relativeLabel(day.date, todayStr)}</p>
          <h2 id="day-panel-title" className="mt-1 font-display text-[34px] uppercase sm:text-[40px]">
            {format(parseISO(day.date), 'EEEE, MMM d')}
          </h2>
        </div>
        {!isFuture && (
          <dl className="flex gap-8">
            <div>
              <dt className="text-[13px] text-lane-mute">Weighted score</dt>
              <dd className="font-display text-[40px] leading-none">{day.score ?? 0}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-lane-mute">Completion</dt>
              <dd className="flex items-baseline gap-1.5">
                <span className="font-display text-[40px] leading-none">{day.completion ?? 0}%</span>
                <span className="tabular text-[13px] text-lane-dim">
                  {doneCount} of {habits.length}
                </span>
              </dd>
            </div>
          </dl>
        )}
      </div>

      <p className="mt-4 text-[14px] text-lane-dim">{note}</p>
      {!isFuture && (
        <p className="mt-1 text-[13px] text-lane-mute">
          Weighted score counts harder habits for more; completion counts every habit the same.
        </p>
      )}

      <div className="mt-3 border-t border-lane-line">
        {habits.map((habit, i) => (
          <LaneRow
            key={habit.id}
            lane={i + 1}
            name={habit.name}
            difficulty={habit.difficulty}
            done={getHabitStatus(habit.id, day.date) === 'completed'}
            onToggle={() => void toggle(habit.id)}
            disabled={isFuture || pending.has(habit.id)}
            dayLabel={day.date === todayStr ? 'today' : `on ${format(parseISO(day.date), 'MMMM d')}`}
          />
        ))}
      </div>
    </section>
  );
}
