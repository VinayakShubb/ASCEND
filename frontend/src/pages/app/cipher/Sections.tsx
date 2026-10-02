import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, Fire } from '@phosphor-icons/react';
import { STATUS_META } from '../../../design/status';
import type { CipherAnalysis, CipherHabit } from '../../../lib/api';
import { cn } from '../../../lib/cn';
import { formatImpact, personalityName } from './format';
import { HabitChip, MetricTrend, RateBars, SectionHead, TrendMark } from './parts';

type Props = { analysis: CipherAnalysis };

/* What moved since the previous stored analysis. */
export function ChangesStrip({ analysis }: Props) {
  return (
    <section aria-label="Changes since your last analysis" className="flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-lane-line py-4">
      <span className="text-[13px] font-semibold text-lane-dim">Since last analysis</span>
      {analysis.changes.map(change => (
        <span key={change.label} className="inline-flex items-center gap-1.5 text-[14px] text-lane">
          {change.direction === 'up' ? (
            <ArrowUpRight weight="bold" className="size-4 text-infield" aria-label="up" role="img" />
          ) : (
            <ArrowDownRight weight="bold" className="size-4 text-dnf" aria-label="down" role="img" />
          )}
          {change.label} <strong className="tabular font-semibold">{change.delta}</strong>
        </span>
      ))}
    </section>
  );
}

/* Key metrics as a results table: each against the user's own baseline. */
export function MetricsTable({ analysis }: Props) {
  return (
    <section aria-labelledby="cipher-metrics" className="border-t border-lane-line pt-10">
      <SectionHead id="cipher-metrics" title="Key numbers" />
      <ul className="border-t border-lane-line">
        {analysis.metrics.map(metric => (
          <li
            key={metric.key}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-5 gap-y-2 border-b border-lane-line py-5 last:border-b-0 md:grid-cols-[11rem_9rem_minmax(0,1fr)] md:items-baseline md:gap-x-8"
          >
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-lane">{metric.label}</p>
              <p className="text-[13px] text-lane-mute">{metric.caption}</p>
            </div>
            <p className="tabular text-right font-display text-[44px] leading-none md:order-none md:text-left">{metric.value}</p>
            <div className="col-span-2 md:col-span-1">
              <p className="flex flex-wrap items-center gap-x-2 text-[14px] text-lane-dim">
                <MetricTrend metricKey={metric.key} trend={metric.trend} />
                <span>{metric.baseline}</span>
              </p>
              <p className="mt-1.5 max-w-[68ch] text-[13.5px] leading-snug text-lane-mute">{metric.explain}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* Today's plan: the best moves as lanes, each with its exact DI impact. */
export function TodayPlan({ analysis }: Props) {
  const { score } = analysis;
  const statusColor = STATUS_META[analysis.status].color;
  const headroom = Math.max(0, score.maxToday - score.value);

  return (
    <section aria-labelledby="cipher-plan" className="border-t border-lane-line pt-10">
      <SectionHead
        id="cipher-plan"
        title="Today's best moves"
        sub={
          <>
            <span className="tabular">{score.value}</span> now, up to <span className="tabular">{score.maxToday}</span> if you finish everything
          </>
        }
      />

      {/* Ceiling: where the index is now, and how far today can still take it. */}
      <div className="mb-8" aria-hidden>
        <div className="relative h-2.5 rounded-full bg-night-800">
          <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${score.value}%`, backgroundColor: statusColor }} />
          <span
            className="absolute inset-y-0 rounded-r-full bg-lane/25"
            style={{ left: `${score.value}%`, width: `${headroom}%` }}
          />
          <span className="absolute -inset-y-1.5 w-0.5 rounded-full bg-lane" style={{ left: `calc(${score.maxToday}% - 1px)` }} />
        </div>
        <div className="tabular mt-2 flex justify-between text-[12px] text-lane-mute">
          <span>0</span>
          <span>100</span>
        </div>
      </div>

      {analysis.atRisk.length > 0 && (
        <div className="mb-8">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold text-lane">
            <Fire weight="fill" className="size-4 text-amber" aria-hidden /> Streaks on the line tonight
          </h3>
          <ul className="mt-3 flex flex-wrap gap-3">
            {analysis.atRisk.map(r => (
              <li key={r.name} className="flex items-center gap-3 rounded-xl border border-lane-line-strong py-2 pl-2 pr-4">
                {/* Race bib: the streak length. */}
                <span className="grid min-w-12 place-items-center rounded-md bg-lane px-2 py-1 text-night-950">
                  <span className="tabular font-display text-[24px] leading-none">{r.streak}</span>
                </span>
                <span className="text-[14px] leading-tight">
                  <span className="block font-semibold text-lane">{r.name}</span>
                  <span className="text-lane-mute">{r.streak}-day streak</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.plan.length === 0 ? (
        <p className="flex items-center gap-2 border-t border-lane-line pt-5 text-[15px] text-lane">
          <Check weight="bold" className="size-5 text-infield" aria-hidden /> Everything is done today. Your score is at today's maximum.
        </p>
      ) : (
        <ol className="border-t border-lane-line">
          {analysis.plan.map((item, i) => (
            <li
              key={item.habitId}
              className="grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-x-3 border-b border-lane-line py-5 last:border-b-0 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:gap-x-6"
            >
              <span className="font-display text-[34px] leading-none text-lane-mute sm:text-[48px]" aria-hidden>
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[17px] font-semibold text-lane">{item.name}</p>
                <p className="mt-1 text-[15px] text-lane-dim">{item.action}</p>
                <p className="mt-2 max-w-[68ch] text-[13.5px] leading-snug text-lane-mute">{item.explain}</p>
              </div>
              <p className="text-right">
                <span className="tabular whitespace-nowrap font-display text-[26px] leading-none text-lane sm:text-[40px]">{formatImpact(item.impact)}</span>
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/* This week's focus: 7 day marks (done, target, empty) and the projection. */
export function WeekFocus({ analysis }: Props) {
  const focus = analysis.focus;
  if (!focus) return null;
  return (
    <section aria-labelledby="cipher-focus" className="border-t border-lane-line pt-10">
      <SectionHead id="cipher-focus" title="This week's focus" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-12">
        <div className="min-w-0">
          <h3 className="font-display text-[34px] uppercase text-lane sm:text-[44px]">{focus.name}</h3>
          <ol className="mt-5 flex gap-1.5 sm:gap-2" aria-label={`${focus.current} of 7 days now, target ${focus.target}`}>
            {Array.from({ length: 7 }, (_, i) => {
              const state = i < focus.current ? 'done' : i < focus.target ? 'target' : 'empty';
              return (
                <li
                  key={i}
                  aria-hidden
                  className={cn(
                    'grid size-9 place-items-center rounded-md sm:size-10',
                    state === 'done' && 'bg-infield text-night-950',
                    state === 'target' && 'border-2 border-dashed border-infield/70',
                    state === 'empty' && 'bg-night-800',
                  )}
                >
                  {state === 'done' && <Check weight="bold" className="size-4" />}
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-[13px] text-lane-mute">
            <span className="tabular">{focus.current}</span> of 7 days now, target <span className="tabular">{focus.target}</span>
          </p>
          {analysis.weeklyFocus && <p className="mt-4 max-w-[62ch] text-[15px] text-lane">{analysis.weeklyFocus}</p>}
        </div>

        <div className="border-t border-lane-line pt-6 lg:border-t-0 lg:border-l lg:pl-10 lg:pt-0">
          <p className="text-[13px] font-medium text-lane-dim">Projected Discipline Index</p>
          <p className="mt-2 flex items-center gap-3 font-display text-[64px] leading-none">
            <span className="tabular text-lane">{analysis.score.value}</span>
            <ArrowRight weight="bold" className="size-7 text-lane-mute" aria-label="to" role="img" />
            <span className="tabular text-infield">{focus.projectedDi}</span>
          </p>
          <p className="mt-2 text-[13px] text-lane-mute">if you hit the target</p>
          <p className="mt-3 text-[13.5px] leading-snug text-lane-dim">{focus.explain}</p>
        </div>
      </div>
    </section>
  );
}

/* What's working and what's holding you back, side by side on wide screens. */
export function Drivers({ analysis }: Props) {
  if (analysis.working.length === 0 && analysis.holdingBack.length === 0) return null;
  return (
    <section aria-label="What drives your score" className="grid border-t border-lane-line lg:grid-cols-2">
      <div className="pt-10 lg:pr-10">
        <SectionHead title="What's working" />
        <p className="max-w-[60ch] text-[15px] text-lane">{analysis.strengths}</p>
        {analysis.working.length === 0 ? (
          <p className="mt-5 text-[14px] text-lane-mute">Nothing above 50% this week yet. One habit done 4 of 7 days changes that.</p>
        ) : (
          <ul className="mt-5 border-t border-lane-line">
            {analysis.working.map(h => (
              <DriverRow key={h.name} habit={h} tone="good" />
            ))}
          </ul>
        )}
      </div>
      <div className="mt-10 border-t border-lane-line pt-10 lg:mt-0 lg:border-t-0 lg:border-l lg:pl-10">
        <SectionHead title="Holding you back" />
        <p className="max-w-[60ch] text-[15px] text-lane">{analysis.risks}</p>
        {analysis.holdingBack.length === 0 ? (
          <p className="mt-5 text-[14px] text-lane-mute">No missed days cost you points this week. Keep it that way.</p>
        ) : (
          <ul className="mt-5 border-t border-lane-line">
            {analysis.holdingBack.map(h => (
              <DriverRow key={h.name} habit={h} tone="bad" />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function DriverRow({ habit, tone }: { habit: CipherHabit; tone: 'good' | 'bad' }) {
  return (
    <li className="border-b border-lane-line py-5 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[16px] font-semibold text-lane">{habit.name}</p>
        {tone === 'good'
          ? habit.streak > 1 && (
              <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-amber">
                <Fire weight="fill" className="size-3.5" aria-hidden />
                <span className="tabular">{habit.streak}d</span>
                <span className="sr-only"> streak</span>
              </span>
            )
          : (
              <span className="text-[13px] font-semibold text-dnf">
                <span className="tabular">{habit.pointsLost7}</span> DI lost this week
              </span>
            )}
      </div>
      <RateBars habit={habit} tone={tone} />
      {tone === 'bad' && <p className="mt-3 text-[13.5px] leading-snug text-lane-mute">{habit.lossExplain}</p>}
      <p className="mt-2 text-[14px] text-lane-dim">{habit.note}</p>
    </li>
  );
}

/* Every active habit: this week against the 30-day average. */
export function Breakdown({ analysis }: Props) {
  return (
    <section aria-labelledby="cipher-breakdown" className="border-t border-lane-line pt-10">
      <SectionHead id="cipher-breakdown" title="Habit breakdown" sub="All active habits, this week vs your 30-day average" />
      <div role="table" aria-label="Habit breakdown" className="border-t border-lane-line">
        <div role="row" className="hidden border-b border-lane-line py-2.5 text-[12px] font-medium text-lane-mute md:grid md:grid-cols-[minmax(0,1fr)_6rem_6rem_5.5rem_7.5rem_6.5rem] md:gap-x-4">
          <span role="columnheader">Habit</span>
          <span role="columnheader" className="text-right">This week</span>
          <span role="columnheader" className="text-right">30-day</span>
          <span role="columnheader" className="text-right">Streak</span>
          <span role="columnheader">Trend</span>
          <span role="columnheader" className="text-right">Status</span>
        </div>
        {analysis.habits.map(h => (
          <div
            key={h.name}
            role="row"
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 border-b border-lane-line py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_6rem_6rem_5.5rem_7.5rem_6.5rem] md:items-center"
          >
            <div role="cell" className="min-w-0">
              <p className="text-[16px] font-semibold text-lane">{h.name}</p>
              <p className="mt-1 hidden text-[13.5px] leading-snug text-lane-dim md:block">{h.note}</p>
            </div>
            <div role="cell" className="flex justify-end md:order-last">
              <HabitChip status={h.status} />
            </div>
            <div className="col-span-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[14px] text-lane-dim md:contents">
              <span role="cell" className="md:text-right">
                <b className="tabular font-semibold text-lane">{h.done7}/7</b>
                <span className="md:sr-only"> this week</span>
              </span>
              <span role="cell" className="md:text-right">
                <b className="tabular font-semibold text-lane">{h.rate30}%</b>
                <span className="md:sr-only"> 30-day</span>
              </span>
              <span role="cell" className="md:text-right">
                <b className="tabular font-semibold text-lane">{h.streak}d</b>
                <span className="md:sr-only"> streak</span>
              </span>
              <span role="cell" className="inline-flex items-center gap-1.5">
                {h.trend === 'flat' ? (
                  <TrendMark trend="flat" />
                ) : (
                  <>
                    <TrendMark trend={h.trend} /> {h.trend === 'up' ? 'improving' : 'dropping'}
                  </>
                )}
              </span>
            </div>
            <p className="col-span-2 text-[13.5px] leading-snug text-lane-dim md:hidden">{h.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* Execution type: the pattern CIPHER sees in the season record. */
export function ExecutionType({ analysis }: Props) {
  const { personality } = analysis;
  const name = personalityName(personality.type);
  return (
    <section aria-labelledby="cipher-type" className="border-t border-lane-line pt-10">
      <SectionHead id="cipher-type" title="Execution type" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
        <div>
          <p className="font-display text-[48px] uppercase text-lane sm:text-[64px]">{name}</p>
          <p className="mt-4 max-w-[52ch] text-[17px] text-lane">{personality.tagline}</p>
        </div>
        <div className="border-t border-lane-line pt-5 lg:border-t-0 lg:border-l lg:pl-10 lg:pt-1">
          <p className="text-[15px] text-lane-dim">{personality.evidence}</p>
          {personality.insight && <p className="mt-4 border-t border-lane-line pt-4 text-[15px] text-lane">{personality.insight}</p>}
        </div>
      </div>
    </section>
  );
}
