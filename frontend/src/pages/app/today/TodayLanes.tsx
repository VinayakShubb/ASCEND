import { useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { LaneRow } from '../../../components/app/LaneRow';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Feedback';
import { duration, ease } from '../../../design/motion';
import type { Habit } from '../../../types';

interface TodayLanesProps {
  habits: Habit[];
  isDone: (id: string) => boolean;
  streaks: Record<string, number>;
  onToggle: (id: string) => void;
  onAdd: () => void;
}

/* Today's habits as lanes, in a fixed order (by creation) so nothing jumps
   under the thumb when a habit is checked off. */
export function TodayLanes({ habits, isDone, streaks, onToggle, onAdd }: TodayLanesProps) {
  const done = habits.filter(h => isDone(h.id)).length;
  const allDone = habits.length > 0 && done === habits.length;

  return (
    <section aria-labelledby="today-habits-heading" className="mt-10">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 id="today-habits-heading" className="font-display text-[26px] uppercase">
          Today's habits
        </h2>
        <Button variant="secondary" size="sm" icon={<Plus weight="bold" className="size-4" />} onClick={onAdd}>
          Add habit
        </Button>
      </div>

      <div className="border-t border-lane-line-strong">
        {habits.map((habit, i) => (
          <LaneRow
            key={habit.id}
            lane={i + 1}
            name={habit.name}
            difficulty={habit.difficulty}
            done={isDone(habit.id)}
            streak={streaks[habit.id] ?? 0}
            meta={habit.category && habit.category !== 'General' ? <span>{habit.category}</span> : undefined}
            onToggle={() => onToggle(habit.id)}
          />
        ))}
      </div>

      <FinishLine allDone={allDone} />
    </section>
  );
}

/* The one moment on Today: when the last lane is crossed, a finish tape is
   drawn under the lanes. Shown plainly (no animation) when the page loads
   with everything already done. */
function FinishLine({ allDone }: { allDone: boolean }) {
  const reduce = useReducedMotion();
  // Animate only once the user has actually seen an unfinished lane here.
  const [sawOpenLane, setSawOpenLane] = useState(!allDone);
  if (!allDone && !sawOpenLane) setSawOpenLane(true);
  const animate = !reduce && sawOpenLane;

  return (
    <AnimatePresence initial={false}>
      {allDone && (
        <motion.div
          key="finish"
          role="status"
          className="mt-6"
          initial={animate ? { opacity: 0 } : false}
          animate={{ opacity: 1, transition: { duration: duration.fast } }}
          exit={{ opacity: 0, transition: { duration: duration.fast } }}
        >
          <motion.div
            aria-hidden
            className="h-[3px] origin-left bg-lane"
            initial={animate ? { scaleX: 0 } : false}
            animate={{ scaleX: 1, transition: { duration: duration.slow * 1.4, ease: ease.out } }}
          />
          <motion.div
            className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1"
            initial={animate ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0, transition: { duration: duration.slow, ease: ease.out, delay: animate ? 0.35 : 0 } }}
          >
            <p className="font-display text-[30px] uppercase sm:text-[36px]">All done today</p>
            <p className="text-[14px] text-lane-dim">Every habit is checked off, so today scores the full 100.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* Lane-shaped placeholders while habits load. */
export function TodayLanesSkeleton() {
  return (
    <div className="mt-10" aria-busy="true" aria-label="Loading today's habits">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
      <div className="border-t border-lane-line-strong">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 border-b border-lane-line px-1 py-3.5 sm:grid-cols-[4rem_1fr_auto] sm:gap-5 sm:px-3">
            <Skeleton className="mx-auto h-10 w-6" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="size-11 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
