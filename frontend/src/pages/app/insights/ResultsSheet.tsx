import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight } from '@phosphor-icons/react';
import { StatusTag } from '../../../components/brand/StatusTag';
import { Skeleton } from '../../../components/ui/Feedback';
import { statusFromIndex } from '../../../design/status';

interface ResultsSheetProps {
  index: number;
  weekAgo: number;
  todayPct: number;
  todayDone: number;
  activeCount: number;
}

/* The headline numbers as a results sheet: the Discipline Index on the
   left with its band, and the supporting results listed on the right, each
   with a plain line saying what it counts. */
export function ResultsSheet({ index, weekAgo, todayPct, todayDone, activeCount }: ResultsSheetProps) {
  const change = index - weekAgo;
  const ChangeIcon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : ArrowRight;
  const changeWord = change > 0 ? 'Up' : change < 0 ? 'Down' : 'No change';

  return (
    <section
      aria-label="Current results"
      className="grid border-y border-lane-line-strong md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
    >
      <div className="border-b border-lane-line py-6 md:border-b-0 md:border-r md:py-8 md:pr-10">
        <h2 className="text-[15px] font-semibold text-lane">Discipline Index</h2>
        <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
          <span className="font-display text-[88px] leading-[0.8] sm:text-[112px]">{index}</span>
          <StatusTag status={statusFromIndex(index)} className="mb-1" />
        </div>
        <p className="mt-4 max-w-[46ch] text-[14px] text-lane-dim">
          Average of your last 7 daily scores, where harder habits count for more. 50 and up is solid, 80 and up is elite.
        </p>
      </div>

      <dl className="divide-y divide-lane-line md:pl-10">
        <Row
          label="Week change"
          note={`Discipline Index now minus 7 days ago (it was ${weekAgo}). Measured in points, not percent.`}
        >
          <span className="inline-flex items-center gap-1.5">
            <ChangeIcon
              weight="bold"
              aria-hidden
              className={change > 0 ? 'size-5 text-infield' : change < 0 ? 'size-5 text-dnf' : 'size-5 text-lane-mute'}
            />
            <span className="sr-only">{changeWord}</span>
            <span className="font-display text-[40px] leading-none">
              {change > 0 ? '+' : ''}
              {change}
            </span>
            <span className="text-[13px] text-lane-dim">pts</span>
          </span>
        </Row>
        <Row
          label="Today's completion"
          note={`Share of your habits checked off today (${todayDone} of ${activeCount}).`}
        >
          <span className="font-display text-[40px] leading-none">{todayPct}%</span>
        </Row>
        <Row label="Active habits" note="Habits you are tracking now. Archived habits are not counted.">
          <span className="font-display text-[40px] leading-none">{activeCount}</span>
        </Row>
      </dl>
    </section>
  );
}

function Row({ label, note, children }: { label: string; note: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-5">
      <div className="min-w-0">
        <dt className="text-[15px] font-semibold text-lane">{label}</dt>
        <p className="mt-1 text-[13px] leading-snug text-lane-mute">{note}</p>
      </div>
      <dd className="shrink-0">{children}</dd>
    </div>
  );
}

export function ResultsSheetSkeleton() {
  return (
    <div aria-hidden className="grid border-y border-lane-line-strong md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="space-y-4 py-8 md:pr-10">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-24 w-40" />
        <Skeleton className="h-4 w-full max-w-80" />
      </div>
      <div className="md:pl-10">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex items-center justify-between gap-6 border-b border-lane-line py-5 last:border-b-0">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full max-w-64" />
            </div>
            <Skeleton className="h-10 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
