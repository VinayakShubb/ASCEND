import type { ReactNode } from 'react';
import { Fire } from '@phosphor-icons/react';
import { format, parseISO } from 'date-fns';
import { motion, useReducedMotion } from 'motion/react';
import { Skeleton } from '../../../components/ui/Feedback';
import { WEIGHT } from '../../../design/habits';
import { press } from '../../../design/motion';
import { cn } from '../../../lib/cn';
import type { Habit } from '../../../types';

const DIFFICULTY_LABEL: Record<Habit['difficulty'], string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard', extreme: 'Extreme' };

function addedOn(habit: Habit) {
  try {
    return format(parseISO(habit.created_at), 'MMM d, yyyy');
  } catch {
    return null;
  }
}

interface HabitRowProps {
  habit: Habit;
  /* Lane number on Today; archived habits have none. */
  lane?: number;
  streak?: number;
  actions: ReactNode;
}

/* A habit in the management list, drawn in the same lane language as Today
   but with actions instead of a check. Everything is visible without hover. */
export function HabitRow({ habit, lane, streak = 0, actions }: HabitRowProps) {
  const archived = habit.archived;
  const added = addedOn(habit);
  const category = habit.category && habit.category !== 'General' ? habit.category : null;

  return (
    <li
      className={cn(
        'grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-lane-line py-4 pr-1 transition-colors duration-200 hover:bg-night-850/60',
        'md:grid-cols-[3.5rem_minmax(0,1fr)_7.5rem_7rem_auto] md:gap-5 md:px-3',
      )}
    >
      <span aria-hidden className={cn('text-center font-display text-[32px] leading-none md:text-[40px]', archived ? 'text-night-600' : 'text-lane-mute')}>
        {lane ?? ''}
      </span>

      <div className="min-w-0">
        <p className={cn('truncate text-[16px] font-semibold', archived ? 'text-lane-dim' : 'text-lane')}>{habit.name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-lane-mute">
          {category && <span className="text-lane-dim">{category}</span>}
          <span className="md:hidden">
            {DIFFICULTY_LABEL[habit.difficulty]} <span className="tabular">{WEIGHT[habit.difficulty]}</span>
          </span>
          {!archived && streak > 0 && (
            <span className="inline-flex items-center gap-1 text-amber md:hidden">
              <Fire weight="fill" className="size-3.5" aria-hidden />
              <span className="tabular">{streak} day streak</span>
            </span>
          )}
          {added && <span>Added {added}</span>}
        </p>
      </div>

      <p className="hidden md:block">
        <span className="block text-[14px] font-medium text-lane">{DIFFICULTY_LABEL[habit.difficulty]}</span>
        <span className="tabular block text-[13px] text-lane-mute">{WEIGHT[habit.difficulty]} weight</span>
      </p>

      <p className="hidden md:block">
        {archived ? (
          <span className="text-[13px] text-lane-mute">Archived</span>
        ) : (
          <>
            <span className={cn('tabular block font-display text-[26px] leading-none', streak > 0 ? 'text-amber' : 'text-lane-mute')}>{streak}</span>
            <span className="block text-[12px] text-lane-mute">day streak</span>
          </>
        )}
      </p>

      <div className="flex items-center gap-0.5 md:gap-1">{actions}</div>
    </li>
  );
}

/* A labelled action: icon only on phones (with an accessible name), icon
   and word from md up. Always visible, never hover-only. */
export function RowAction({
  text,
  label,
  icon,
  onClick,
  tone = 'default',
  disabled,
}: {
  /* Visible word (md and up). */
  text: string;
  /* Full accessible name, e.g. "Edit Reading". */
  label: string;
  icon: ReactNode;
  onClick: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      whileTap={reduce ? undefined : { scale: 0.94 }}
      transition={press}
      className={cn(
        'inline-flex size-11 items-center justify-center gap-1.5 rounded-full text-[13px] font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-45 md:w-auto md:px-3.5',
        tone === 'danger' ? 'text-lane-dim hover:bg-dnf/10 hover:text-dnf' : 'text-lane-dim hover:bg-night-800 hover:text-lane',
      )}
    >
      {icon}
      <span className="hidden md:inline">{text}</span>
    </motion.button>
  );
}

export function HabitRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul aria-busy="true" aria-label="Loading habits" className="border-t border-lane-line-strong">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-lane-line py-4 md:grid-cols-[3.5rem_minmax(0,1fr)_7.5rem_7rem_auto] md:gap-5 md:px-3">
          <Skeleton className="mx-auto h-8 w-5" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="hidden h-8 w-20 md:block" />
          <Skeleton className="hidden h-8 w-12 md:block" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </li>
      ))}
    </ul>
  );
}
