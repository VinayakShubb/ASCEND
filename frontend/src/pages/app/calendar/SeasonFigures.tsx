import { Skeleton } from '../../../components/ui/Feedback';
import type { SeasonSummary } from './season';

/* The season so far as a results list: label and what it counts on the
   left, the figure on the right, hairlines between. */
export function SeasonFigures({ summary }: { summary: SeasonSummary }) {
  const rows = [
    {
      label: 'Active days',
      value: summary.activeDays,
      unit: `of ${summary.tracked}`,
      note: 'Days with at least one habit done, out of the days tracked so far.',
    },
    {
      label: 'Current run',
      value: summary.currentRun,
      unit: summary.currentRun === 1 ? 'day' : 'days',
      note: 'Days in a row with at least one habit done, up to today (or yesterday if today is still open).',
    },
    {
      label: 'Longest run',
      value: summary.longestRun,
      unit: summary.longestRun === 1 ? 'day' : 'days',
      note: 'Your best run of days in a row with at least one habit done.',
    },
    {
      label: 'Perfect days',
      value: summary.perfectDays,
      unit: summary.perfectDays === 1 ? 'day' : 'days',
      note: 'Days you finished every habit (a score of 100).',
    },
  ];
  return (
    <dl className="border-t border-lane-line-strong">
      {rows.map(row => (
        <div key={row.label} className="flex items-start justify-between gap-5 border-b border-lane-line py-4">
          <div className="min-w-0">
            <dt className="text-[15px] font-semibold text-lane">{row.label}</dt>
            <p className="mt-1 text-[13px] leading-snug text-lane-mute">{row.note}</p>
          </div>
          <dd className="flex shrink-0 items-baseline gap-1.5">
            <span className="font-display text-[40px] leading-none">{row.value}</span>
            <span className="text-[13px] text-lane-dim">{row.unit}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function SeasonFiguresSkeleton() {
  return (
    <div className="border-t border-lane-line-strong" aria-hidden>
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="flex items-center justify-between gap-5 border-b border-lane-line py-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-full max-w-56" />
          </div>
          <Skeleton className="h-9 w-14" />
        </div>
      ))}
    </div>
  );
}
