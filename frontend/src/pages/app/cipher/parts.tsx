import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Trophy } from '@phosphor-icons/react';
import { CipherAvatar, type AvatarSize, type CipherMood } from '../../../components/brand/CipherAvatar';
import type { CipherHabit, Trend } from '../../../lib/api';
import { cn } from '../../../lib/cn';
import { HABIT_STATUS } from './format';

/* Section heading: painted condensed type with an optional plain sentence. */
export function SectionHead({ id, title, sub, aside }: { id?: string; title: ReactNode; sub?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="min-w-0">
        <h2 id={id} className="font-display text-[30px] uppercase sm:text-[36px]">
          {title}
        </h2>
        {sub && <p className="mt-2 text-[14px] text-lane-dim">{sub}</p>}
      </div>
      {aside}
    </div>
  );
}

/* Up/down arrows; "no real change" is spelled out, since a bare dash reads
   like a rendering glitch. */
export function TrendMark({ trend, className }: { trend: Trend; className?: string }) {
  if (trend === 'up')
    return <ArrowUpRight weight="bold" className={cn('size-4 shrink-0 text-infield', className)} aria-label="up" role="img" />;
  if (trend === 'down')
    return <ArrowDownRight weight="bold" className={cn('size-4 shrink-0 text-dnf', className)} aria-label="down" role="img" />;
  return <span className="text-[13px] font-medium text-lane-mute">steady</span>;
}

/* A streak has no "usual" to compare with: only celebrate a record. */
export function MetricTrend({ metricKey, trend }: { metricKey: string; trend: Trend }) {
  if (metricKey === 'streak') {
    return trend === 'up' ? (
      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-infield">
        <Trophy weight="fill" className="size-3.5" aria-hidden /> Personal best
      </span>
    ) : null;
  }
  return <TrendMark trend={trend} />;
}

export function HabitChip({ status }: { status: CipherHabit['status'] }) {
  const meta = HABIT_STATUS[status];
  return (
    <span
      className={cn('inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold capitalize', meta.text)}
      style={{ backgroundColor: `color-mix(in srgb, ${meta.color} 14%, transparent)` }}
    >
      {status}
    </span>
  );
}

/* Completion over 7 and 30 days as two thin lane bars. */
export function RateBars({ habit, tone }: { habit: CipherHabit; tone: 'good' | 'bad' }) {
  const rows = [
    { label: '7 days', value: habit.rate7, muted: false },
    { label: '30 days', value: habit.rate30, muted: true },
  ];
  return (
    <div className="mt-3 grid gap-1.5">
      {rows.map(row => (
        <div key={row.label} className="grid grid-cols-[4.25rem_1fr_3rem] items-center gap-3 text-[13px]">
          <span className="text-lane-mute">{row.label}</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-night-700" aria-hidden>
            <span
              className={cn(
                'block h-full rounded-full',
                row.muted ? 'bg-lane-mute/60' : tone === 'good' ? 'bg-infield' : 'bg-dnf',
              )}
              style={{ width: `${row.value}%` }}
            />
          </span>
          <span className={cn('tabular text-right font-semibold', row.muted ? 'text-lane-dim' : 'text-lane')}>{row.value}%</span>
        </div>
      ))}
    </div>
  );
}

export function CipherFace({ mood, size }: { mood: CipherMood; size: AvatarSize }) {
  return (
    <span className="inline-flex shrink-0" aria-hidden>
      <CipherAvatar mood={mood} size={size} />
    </span>
  );
}
