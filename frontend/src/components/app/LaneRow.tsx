import { Check, Fire } from '@phosphor-icons/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { duration, ease, press } from '../../design/motion';
import { cn } from '../../lib/cn';
import type { Difficulty } from '../../types';
import { WEIGHT } from '../../design/habits';

interface LaneRowProps {
  lane: number;
  name: string;
  difficulty: Difficulty;
  done: boolean;
  streak?: number;
  meta?: ReactNode;
  onToggle: () => void;
  disabled?: boolean;
  /* Which day this row is for, in words, for screen readers ("today", "on 12 Sep"). */
  dayLabel?: string;
}

/* A habit as a lane. The whole row is the control (a large touch target);
   completing it crosses the finish line: a lane-white sweep runs across the
   row and the finish box fills track red. */
export function LaneRow({ lane, name, difficulty, done, streak = 0, meta, onToggle, disabled, dayLabel = 'today' }: LaneRowProps) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={`${name}, ${difficulty}, ${done ? 'done' : 'not done'} ${dayLabel}`}
      onClick={onToggle}
      disabled={disabled}
      whileTap={reduce ? undefined : { scale: 0.985 }}
      transition={press}
      className={cn(
        'group relative grid w-full grid-cols-[3.25rem_1fr_auto] items-center gap-3 overflow-hidden px-1 py-3.5 text-left sm:grid-cols-[4rem_1fr_auto_auto] sm:gap-5 sm:px-3',
        'border-b border-lane-line transition-colors duration-200 hover:bg-night-850/70 disabled:opacity-60',
      )}
    >
      {/* Finish-line sweep, only when the habit is checked off (not on load). */}
      <AnimatePresence initial={false}>
        {done && !reduce && (
          <motion.span
            key="sweep"
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-lane/10 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '320%', transition: { duration: duration.slow, ease: ease.out } }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <span
        className={cn(
          'font-display text-center text-[40px] leading-none transition-colors duration-300 sm:text-[48px]',
          done ? 'text-track-bright' : 'text-lane-mute group-hover:text-lane-dim',
        )}
        aria-hidden
      >
        {lane}
      </span>

      <span className="min-w-0">
        <span className={cn('block truncate text-[16px] font-semibold sm:text-[17px]', done ? 'text-lane-dim' : 'text-lane')}>{name}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-lane-mute">
          <span className="capitalize">{difficulty}</span>
          <span className="tabular sm:hidden">{WEIGHT[difficulty]}</span>
          {streak > 1 && (
            <span className="inline-flex items-center gap-1 text-amber">
              <Fire weight="fill" className="size-3.5" />
              <span className="tabular">{streak}d</span>
            </span>
          )}
          {meta}
        </span>
      </span>

      <span className="tabular hidden text-[14px] font-medium text-lane-dim sm:block" aria-hidden>
        {WEIGHT[difficulty]}
      </span>

      <span
        aria-hidden
        className={cn(
          'grid size-11 place-items-center rounded-xl border-2 transition-[background-color,border-color] duration-200',
          done ? 'border-track bg-track text-track-ink' : 'border-lane-line-strong group-hover:border-lane-dim',
        )}
      >
        <AnimatePresence initial={false}>
          {done && (
            <motion.span
              key="check"
              initial={reduce ? false : { scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={press}
            >
              <Check weight="bold" className="size-5" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </motion.button>
  );
}
