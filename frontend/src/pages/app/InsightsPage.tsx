import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { Button } from '../../components/ui/Button';
import { EmptyState, InlineError, Skeleton } from '../../components/ui/Feedback';
import { PageHeader } from '../../components/ui/PageHeader';
import { useData } from '../../context/DataContext';
import { useStreaks } from '../../hooks/useStats';
import { useTrackingStart } from '../../hooks/useTrackingStart';
import { statsApi } from '../../lib/api';
import { useRequest, useTodayStr } from './calendar/useRequest';
import { HabitBreakdown, HabitBreakdownSkeleton } from './insights/HabitBreakdown';
import { habitInsights } from './insights/habitStats';
import { ResultsSheet, ResultsSheetSkeleton } from './insights/ResultsSheet';
import { TrendChart, type TrendPoint } from './insights/TrendChart';

/* Trends and per-habit performance: where the Discipline Index stands, how
   the last 30 days went, and how each habit is holding up. */
export function InsightsPage() {
  const navigate = useNavigate();
  const { habits, logs, loading: dataLoading } = useData();
  const streaks = useStreaks();
  const todayStr = useTodayStr();
  const trackingStart = useTrackingStart();
  const activeHabits = useMemo(() => habits.filter(h => !h.archived), [habits]);

  // Journey mode for the first 30 days of history (start..start+29, future
  // days left blank), then a rolling window of the last 30 days.
  const trend = useMemo(() => {
    const today = parseISO(todayStr);
    const daysIn = differenceInCalendarDays(today, trackingStart);
    const journey = daysIn < 30;
    const start = journey ? trackingStart : addDays(today, -29);
    return { journey, dayNumber: daysIn + 1, start, startStr: format(start, 'yyyy-MM-dd') };
  }, [todayStr, trackingStart]);

  const habitKey = activeHabits.map(h => `${h.id}:${h.difficulty}`).join(',');
  const dataKey = dataLoading ? null : `${habitKey}|${logs.length}`;
  const weekAgoStr = format(addDays(parseISO(todayStr), -7), 'yyyy-MM-dd');

  const summaries = useRequest(dataKey, () => Promise.all([statsApi.summary(), statsApi.summary(weekAgoStr)]));
  const range = useRequest(dataKey === null ? null : `${trend.startStr}|${dataKey}`, () =>
    statsApi.range(trend.startStr, todayStr),
  );

  const points: TrendPoint[] = useMemo(() => {
    const byDate = new Map((range.data ?? []).map(d => [d.date, d]));
    return Array.from({ length: 30 }, (_, i) => {
      const date = format(addDays(trend.start, i), 'yyyy-MM-dd');
      if (date > todayStr) return { date, score: null, completion: null };
      const stat = byDate.get(date);
      return { date, score: stat?.weighted_score ?? 0, completion: stat?.completion_pct ?? 0 };
    });
  }, [range.data, trend.start, todayStr]);

  const scored = points.filter(p => p.score !== null) as (TrendPoint & { score: number })[];
  const average = scored.length ? Math.round(scored.reduce((sum, p) => sum + p.score, 0) / scored.length) : null;
  const best = scored.reduce<(TrendPoint & { score: number }) | null>((b, p) => (!b || p.score >= b.score ? p : b), null);
  const low = scored.reduce<(TrendPoint & { score: number }) | null>((b, p) => (!b || p.score <= b.score ? p : b), null);

  const rows = useMemo(
    () => habitInsights(activeHabits, logs, streaks, todayStr),
    [activeHabits, logs, streaks, todayStr],
  );
  const todayDone = rows.filter(r => r.week[6].state === 'done').length;

  const header = (
    <PageHeader
      title="Insights"
      description="Where your Discipline Index stands, how your daily scores moved, and how each habit is holding up."
    />
  );

  // DataContext starts with no habits before its first load begins, so only
  // call the list empty once a stats request has also come back.
  if (!dataLoading && activeHabits.length === 0 && summaries.data !== undefined) {
    return (
      <>
        {header}
        <EmptyState
          title="Nothing to measure yet"
          body="Insights are built from the habits you check off. Add a habit, check it off on Today, and your trends start here."
          action={<Button onClick={() => navigate('/app/habits')}>Add habit</Button>}
        />
      </>
    );
  }

  return (
    <>
      {header}

      {summaries.error ? (
        <InlineError
          message="Could not load your Discipline Index. Check your connection and try again."
          action={
            <Button size="sm" variant="secondary" onClick={summaries.retry}>
              Try again
            </Button>
          }
        />
      ) : dataLoading || !summaries.data ? (
        <ResultsSheetSkeleton />
      ) : (
        <ResultsSheet
          index={summaries.data[0].discipline_index}
          weekAgo={summaries.data[1].discipline_index}
          todayPct={summaries.data[0].today_completion_pct}
          todayDone={todayDone}
          activeCount={activeHabits.length}
        />
      )}

      <section aria-labelledby="trend-title" className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h2 id="trend-title" className="font-display text-[34px] uppercase sm:text-[40px]">
            {trend.journey ? 'Your first 30 days' : 'Last 30 days'}
          </h2>
          {trend.journey && (
            <p className="text-[14px] text-lane-dim">
              Day <span className="tabular">{trend.dayNumber}</span> of 30. The chart fills in as the days pass.
            </p>
          )}
        </div>
        <p className="mt-2 max-w-[62ch] text-[14px] text-lane-dim">
          Daily weighted score: the share of each day's habits you finished, with harder habits counting for more.
        </p>

        <div className="mt-6">
          {range.error ? (
            <InlineError
              message="Could not load your daily scores. Check your connection and try again."
              action={
                <Button size="sm" variant="secondary" onClick={range.retry}>
                  Try again
                </Button>
              }
            />
          ) : dataLoading || range.loading ? (
            <Skeleton className="h-[260px] w-full sm:h-[300px]" />
          ) : (
            <>
              <TrendChart data={points} average={average} />
              {best && low && average !== null && (
                <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-3 border-t border-lane-line pt-4">
                  <Fact
                    label="Average"
                    keyLine
                    value={String(average)} detail={`over ${scored.length} ${scored.length === 1 ? 'day' : 'days'}`} />
                  <Fact label="Best day" value={String(best.score)} detail={format(parseISO(best.date), 'MMM d')} />
                  <Fact label="Lowest day" value={String(low.score)} detail={format(parseISO(low.date), 'MMM d')} />
                </dl>
              )}
              <details className="group mt-5">
                <summary className="inline-flex min-h-11 cursor-pointer items-center text-[14px] font-medium text-lane-dim underline decoration-lane-line-strong underline-offset-4 hover:text-lane">
                  Show the daily scores as a table
                </summary>
                <div className="mt-3 max-h-[360px] overflow-y-auto border-t border-lane-line">
                  <table className="w-full text-left text-[14px]">
                    <caption className="sr-only">Daily weighted score and completion</caption>
                    <thead className="sticky top-0 bg-night-950 text-[12px] text-lane-mute">
                      <tr>
                        <th scope="col" className="py-2 font-semibold">Date</th>
                        <th scope="col" className="py-2 text-right font-semibold">Score</th>
                        <th scope="col" className="py-2 text-right font-semibold">Completion</th>
                      </tr>
                    </thead>
                    <tbody className="tabular">
                      {[...scored].reverse().map(p => (
                        <tr key={p.date} className="border-t border-lane-line">
                          <td className="py-2 text-lane-dim">{format(parseISO(p.date), 'EEE, MMM d')}</td>
                          <td className="py-2 text-right font-semibold">{p.score}</td>
                          <td className="py-2 text-right text-lane-dim">{p.completion}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}
        </div>
      </section>

      <section aria-labelledby="habits-title" className="mt-14">
        <h2 id="habits-title" className="font-display text-[34px] uppercase sm:text-[40px]">
          Habits
        </h2>
        <p className="mt-2 mb-6 max-w-[68ch] text-[14px] text-lane-dim">
          7 and 30 days show the share of days each habit was done. Today counts once it is done, and days before a habit
          started are left out. Streak is days in a row up to today or yesterday.
        </p>
        {dataLoading ? <HabitBreakdownSkeleton /> : <HabitBreakdown rows={rows} />}
      </section>
    </>
  );
}

function Fact({ label, value, detail, keyLine }: { label: string; value: string; detail: string; keyLine?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="inline-flex items-center gap-2 text-[13px] text-lane-mute">
        {/* Line key for the average reference line drawn across the chart. */}
        {keyLine && <span aria-hidden className="h-px w-4 translate-y-[-2px] bg-lane-dim" />}
        {label}
      </dt>
      <dd className="flex items-baseline gap-1.5">
        <span className="font-display text-[26px] leading-none">{value}</span>
        <span className="text-[13px] text-lane-dim">{detail}</span>
      </dd>
    </div>
  );
}
