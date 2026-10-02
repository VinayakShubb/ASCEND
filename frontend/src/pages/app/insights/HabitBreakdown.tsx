import type { ReactNode } from 'react';
import { Check, Fire } from '@phosphor-icons/react';
import { Skeleton } from '../../../components/ui/Feedback';
import { WEIGHT } from '../../../design/habits';
import { cn } from '../../../lib/cn';
import { rate, type HabitInsight, type MarkState } from './habitStats';

const GRID = 'md:grid-cols-[4rem_minmax(0,1fr)_13.5rem_4.5rem_4.5rem_4.5rem_4.5rem]';

/* Each active habit as a lane: name and weight, its last seven days as
   marks, then its rates. Column heads on wide screens; inline labels on
   phones so every figure is readable without hovering. */
export function HabitBreakdown({ rows }: { rows: HabitInsight[] }) {
  return (
    <div>
      <div
        aria-hidden
        className={cn(
          'hidden border-b border-lane-line-strong pb-3 text-[12px] font-semibold text-lane-mute md:grid md:items-end md:gap-5 md:px-3',
          GRID,
        )}
      >
        <span>Lane</span>
        <span>Habit and weight</span>
        <span>Last 7 days</span>
        <span className="text-right">7 days</span>
        <span className="text-right">30 days</span>
        <span className="text-right">Streak</span>
        <span className="text-right">All time</span>
      </div>
      <ol>
        {rows.map((row, i) => (
          <HabitLane key={row.habit.id} row={row} lane={i + 1} />
        ))}
      </ol>
    </div>
  );
}

function HabitLane({ row, lane }: { row: HabitInsight; lane: number }) {
  const r7 = rate(row.done7, row.days7);
  const r30 = rate(row.done30, row.days30);
  return (
    <li
      className={cn(
        'grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-3 gap-y-4 border-b border-lane-line px-1 py-5 md:items-center md:gap-5 md:px-3',
        GRID,
      )}
    >
      <span aria-hidden className="font-display text-center text-[40px] leading-none text-lane-mute md:text-[48px]">
        {lane}
      </span>

      <div className="min-w-0 self-center">
        <h3 className="truncate text-[17px] font-semibold text-lane">{row.habit.name}</h3>
        <p className="mt-0.5 flex flex-wrap gap-x-3 text-[13px] text-lane-mute">
          <span className="capitalize">{row.habit.difficulty}</span>
          <span className="tabular">{WEIGHT[row.habit.difficulty]} weight</span>
          {row.habit.category && <span>{row.habit.category}</span>}
        </p>
      </div>

      <div className="col-span-2 md:col-span-1">
        <WeekMarks week={row.week} name={row.habit.name} />
      </div>

      <dl className="col-span-2 grid grid-cols-4 gap-3 md:contents">
        <Figure label="7 days" value={r7 === null ? 'New' : `${r7}%`} detail={`${row.done7} of ${row.days7}`} />
        <Figure label="30 days" value={r30 === null ? 'New' : `${r30}%`} detail={`${row.done30} of ${row.days30}`} />
        <Figure
          label="Streak"
          value={String(row.streak)}
          detail={row.streak === 1 ? 'day' : 'days'}
          icon={row.streak > 1 ? <Fire weight="fill" className="size-3.5 text-amber" aria-hidden /> : null}
        />
        <Figure label="All time" value={String(row.total)} detail="done" />
      </dl>
    </li>
  );
}

function Figure({ label, value, detail, icon }: { label: string; value: string; detail: string; icon?: ReactNode }) {
  return (
    <div className="min-w-0 md:text-right">
      <dt className="text-[12px] font-medium text-lane-mute md:sr-only">{label}</dt>
      <dd>
        <span className="inline-flex items-center gap-1 font-display text-[26px] leading-none md:justify-end">
          {icon}
          {value}
        </span>
        <span className="tabular mt-1 block text-[12px] text-lane-mute">{detail}</span>
      </dd>
    </div>
  );
}

const MARK_TEXT: Record<MarkState, string> = {
  done: 'done',
  missed: 'missed',
  open: 'not done yet',
  before: 'before this habit started',
};

function WeekMarks({ week, name }: { week: HabitInsight['week']; name: string }) {
  const summary = week.map(d => `${d.dayName} ${MARK_TEXT[d.state]}`).join(', ');
  return (
    <div role="img" aria-label={`${name}, last 7 days: ${summary}`} className="flex gap-1.5">
      {week.map(d => (
        <div key={d.date} className="flex w-7 flex-col items-center gap-1.5" aria-hidden>
          <span
            className={cn(
              'grid size-7 place-items-center rounded-md',
              d.state === 'done' && 'bg-track text-track-ink',
              d.state === 'missed' && 'border border-lane-line-strong',
              d.state === 'open' && 'border border-dashed border-lane-dim',
              d.state === 'before' && 'bg-night-850',
            )}
          >
            {d.state === 'done' && <Check weight="bold" className="size-3.5" />}
          </span>
          <span className={cn('text-[11px] font-semibold', d.state === 'open' || d.date === week[6].date ? 'text-lane' : 'text-lane-mute')}>
            {d.letter}
          </span>
        </div>
      ))}
    </div>
  );
}

export function HabitBreakdownSkeleton() {
  return (
    <div aria-hidden>
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-4 border-b border-lane-line py-5">
          <Skeleton className="h-10 w-10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="hidden h-8 w-52 md:block" />
          <Skeleton className="hidden h-8 w-64 md:block" />
        </div>
      ))}
    </div>
  );
}
