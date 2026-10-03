import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { format, parseISO, startOfMonth } from 'date-fns';
import { Button } from '../../components/ui/Button';
import { EmptyState, InlineError, Skeleton } from '../../components/ui/Feedback';
import { PageHeader } from '../../components/ui/PageHeader';
import { useData } from '../../context/DataContext';
import { useTrackingStart } from '../../hooks/useTrackingStart';
import { statsApi } from '../../lib/api';
import { DayPanel } from './calendar/DayPanel';
import { Legend } from './calendar/Legend';
import { MonthGrid } from './calendar/MonthGrid';
import { SeasonFigures, SeasonFiguresSkeleton } from './calendar/SeasonFigures';
import { YearHeatmap } from './calendar/YearHeatmap';
import { buildDays, seasonWindow, summarize } from './calendar/season';
import { useRequest, useTodayStr } from './calendar/useRequest';

/* Your season record: every day of the 12-month window coloured by its
   weighted score, the selected day's habits to review or correct, and the
   season's figures. */
export function CalendarPage() {
  const navigate = useNavigate();
  const { habits, logs, loading: dataLoading } = useData();
  const todayStr = useTodayStr();
  const trackingStart = useTrackingStart();
  const activeHabits = useMemo(() => habits.filter(h => !h.archived), [habits]);

  const { start, end } = useMemo(() => seasonWindow(trackingStart, parseISO(todayStr)), [trackingStart, todayStr]);
  const startStr = format(start, 'yyyy-MM-dd');
  const fetchEnd = format(end, 'yyyy-MM-dd') < todayStr ? format(end, 'yyyy-MM-dd') : todayStr;

  // Refetch when the habit set changes, when logs change, and after a toggle
  // has been saved (the log list changes before the server has the toggle).
  const [saved, setSaved] = useState(0);
  const habitKey = activeHabits.map(h => `${h.id}:${h.difficulty}`).join(',');
  const requestKey = dataLoading ? null : `${startStr}|${fetchEnd}|${habitKey}|${logs.length}|${saved}`;
  const range = useRequest(requestKey, () => statsApi.range(startStr, fetchEnd));

  const statsByDate = useMemo(() => new Map((range.data ?? []).map(d => [d.date, d])), [range.data]);
  const days = useMemo(() => buildDays(start, end, todayStr, statsByDate), [start, end, todayStr, statsByDate]);
  const dayMap = useMemo(() => new Map(days.map(d => [d.date, d])), [days]);
  const summary = useMemo(() => summarize(range.data ?? [], todayStr), [range.data, todayStr]);

  const [selected, setSelected] = useState(todayStr);
  const [month, setMonth] = useState(() => startOfMonth(parseISO(todayStr)));
  const selectedDay = dayMap.get(selected) ?? dayMap.get(todayStr)!;

  const select = (date: string) => {
    setSelected(date);
    setMonth(startOfMonth(parseISO(date)));
  };

  const header = (
    <PageHeader
      title="Calendar"
      description={`Your season record since ${format(start, 'MMMM d, yyyy')}. Each square is one day, coloured by that day's weighted score. Pick a day to see or correct it.`}
    />
  );

  // DataContext starts with no habits before its first load begins, so only
  // call the list empty once the stats request has also come back.
  if (!dataLoading && activeHabits.length === 0 && range.data !== undefined) {
    return (
      <>
        {header}
        <EmptyState
          title="No habits yet"
          body="The calendar fills in as you check habits off. Add your first habit, then check it off on Today."
          action={<Button onClick={() => navigate('/app/habits')}>Add habit</Button>}
        />
      </>
    );
  }

  const showSkeleton = dataLoading || range.loading;

  return (
    <>
      {header}

      {range.error && (
        <div className="mb-6">
          <InlineError
            message="Could not load your daily scores. Check your connection and try again."
            action={
              <Button size="sm" variant="secondary" onClick={range.retry}>
                Try again
              </Button>
            }
          />
        </div>
      )}

      {showSkeleton ? (
        <CalendarSkeleton />
      ) : (
        <>
          <section aria-label="Season record" className={range.refreshing ? 'opacity-90 transition-opacity' : 'transition-opacity'}>
            <div className="hidden sm:block">
              <YearHeatmap days={days} selected={selectedDay.date} onSelect={select} />
            </div>
            <div className="sm:hidden">
              <MonthGrid
                month={month}
                onMonthChange={setMonth}
                days={dayMap}
                windowStart={start}
                windowEnd={end}
                selected={selectedDay.date}
                onSelect={select}
              />
            </div>
            <div className="mt-6">
              <Legend />
            </div>
          </section>

          <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14">
            <DayPanel
              day={selectedDay}
              todayStr={todayStr}
              habits={activeHabits}
              onChanged={() => setSaved(s => s + 1)}
            />
            <section aria-labelledby="season-figures-title">
              <h2 id="season-figures-title" className="mb-4 font-display text-[28px] uppercase">
                Season so far
              </h2>
              <SeasonFigures summary={summary} />
            </section>
          </div>
        </>
      )}
    </>
  );
}

function CalendarSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your calendar">
      <Skeleton className="hidden h-[190px] w-full sm:block" />
      <div className="mx-auto max-w-[28rem] sm:hidden">
        <Skeleton className="mb-4 h-9 w-48" />
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }, (_, i) => (
            <Skeleton key={i} className="aspect-square min-h-11 rounded-lg" />
          ))}
        </div>
      </div>
      <Skeleton className="mt-6 h-4 w-full max-w-xl" />
      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14">
        <div>
          <Skeleton className="h-10 w-72" />
          <div className="mt-6 border-t border-lane-line">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4 border-b border-lane-line py-4">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="size-11 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
        <SeasonFiguresSkeleton />
      </div>
    </div>
  );
}
