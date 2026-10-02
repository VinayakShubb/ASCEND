import { useMemo, useRef, useState } from 'react';
import { ArrowClockwise, Plus } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { Button } from '../../components/ui/Button';
import { EmptyState, InlineError } from '../../components/ui/Feedback';
import { useData } from '../../context/DataContext';
import { useStreaks } from '../../hooks/useStats';
import { HabitDialog } from './habits/HabitDialog';
import { CoachRail } from './today/CoachRail';
import { DailyBrief } from './today/DailyBrief';
import { TodayBoard, TodayBoardSkeleton } from './today/TodayBoard';
import { TodayLanes, TodayLanesSkeleton } from './today/TodayLanes';
import { useBoardStats } from './today/useTodayData';

/* Today: the results board, the daily brief and today's habits as lanes,
   with the coach panel beside them on wide screens. */
export function TodayPage() {
  const { habits, logs, loading, toggleHabitCompletion, getHabitStatus } = useData();
  const streaks = useStreaks();
  const { board, error, retry } = useBoardStats();
  const [adding, setAdding] = useState(false);
  const pending = useRef(new Set<string>());

  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');

  const active = useMemo(
    () => habits.filter(h => !h.archived).sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [habits],
  );
  const isDone = (id: string) => getHabitStatus(id, today) === 'completed';
  const doneCount = active.filter(h => isDone(h.id)).length;

  const handleToggle = (id: string) => {
    // One request per lane at a time; a fast double tap shouldn't race itself.
    if (pending.current.has(id)) return;
    pending.current.add(id);
    toggleHabitCompletion(id, today).finally(() => pending.current.delete(id));
  };

  const firstLoad = loading || (!board && !error);
  const header = (
    <header className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 sm:mb-8">
      <h1 className="font-display text-[44px] uppercase sm:text-[56px]">Today</h1>
      <p className="text-[14px] text-lane-dim">{format(now, 'EEEE, MMMM d')}</p>
    </header>
  );

  if (firstLoad) {
    return (
      <div className="grid gap-x-12 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {header}
          <TodayBoardSkeleton />
          <TodayLanesSkeleton />
        </div>
      </div>
    );
  }

  if (!board && error) {
    return (
      <div>
        {header}
        <InlineError
          message={`Could not load today's numbers. ${error}`}
          action={
            <Button variant="secondary" size="sm" icon={<ArrowClockwise weight="bold" className="size-4" />} onClick={retry}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  if (active.length === 0) {
    return (
      <div>
        {header}
        <EmptyState
          title="No habits yet"
          body="Add a habit you want to do every day, then check it off here each time you do it."
          action={
            <Button icon={<Plus weight="bold" className="size-4" />} onClick={() => setAdding(true)}>
              Add your first habit
            </Button>
          }
        />
        <HabitDialog open={adding} onOpenChange={setAdding} />
      </div>
    );
  }

  return (
    <div className="grid gap-x-12 gap-y-14 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        {header}
        {board && <TodayBoard board={board} done={doneCount} total={active.length} />}
        {error && board && (
          <div className="mt-4">
            <InlineError
              message="Could not refresh your numbers. The board shows the last figures it received."
              action={
                <Button variant="secondary" size="sm" onClick={retry}>
                  Try again
                </Button>
              }
            />
          </div>
        )}
        <DailyBrief enabled={active.length > 0} />
        <TodayLanes habits={active} isDone={isDone} streaks={streaks} onToggle={handleToggle} onAdd={() => setAdding(true)} />
      </div>

      <div className="min-w-0 border-t border-lane-line-strong pt-8 xl:border-t-0 xl:border-l xl:pl-8 xl:pt-[5.4rem]">
        <CoachRail habits={active} logs={logs} streaks={streaks} />
      </div>

      <HabitDialog open={adding} onOpenChange={setAdding} />
    </div>
  );
}
