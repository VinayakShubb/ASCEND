import type { ReactNode } from 'react';
import { BoardNumber, ResultsBoard } from '../../../components/brand/Scoreboard';
import { StatusTag } from '../../../components/brand/StatusTag';
import { Skeleton } from '../../../components/ui/Feedback';
import { statusFromIndex } from '../../../design/status';
import type { BoardStats } from './useTodayData';

interface TodayBoardProps {
  board: BoardStats;
  done: number;
  total: number;
}

/* The results board strip: Discipline Index large, then today's weighted
   score, the done count and the highest DI still reachable today. */
export function TodayBoard({ board, done, total }: TodayBoardProps) {
  const { discipline_index: di, today_weighted_score: score } = board.summary;
  const maxToday = board.ceiling.max_today;
  const gain = Math.max(0, maxToday - di);

  return (
    <ResultsBoard>
      <div className="grid grid-cols-3 sm:grid-cols-[1.35fr_1fr_1fr_1fr]">
        <div className="col-span-3 flex items-end justify-between gap-4 border-b border-lane-line px-5 py-5 sm:col-span-1 sm:flex-col sm:items-start sm:justify-end sm:border-b-0 sm:border-r sm:px-6 sm:py-6">
          <BoardNumber value={di} className="text-[64px] text-lane sm:text-[76px]" flipOnMount />
          <div className="flex flex-col items-end gap-1.5 text-right sm:mt-3 sm:items-start sm:text-left">
            <span className="flex flex-wrap items-center justify-end gap-2 sm:justify-start">
              <span className="text-[14px] font-semibold text-lane">Discipline Index</span>
              <StatusTag status={statusFromIndex(di)} className="px-2 py-0.5 text-[11px]" />
            </span>
            <span className="text-[12px] text-lane-mute">7-day average of daily scores</span>
          </div>
        </div>

        <Figure label="Today's score" hint="out of 100">
          <BoardNumber value={score} className="text-[34px] text-lane sm:text-[44px]" />
        </Figure>

        <Figure label="Done" hint={done === total ? 'all habits' : `${total - done} left`}>
          <span className="flex items-baseline gap-1.5">
            <BoardNumber value={done} className="text-[34px] text-lane sm:text-[44px]" />
            <span className="tabular text-[13px] text-lane-dim">of {total}</span>
          </span>
        </Figure>

        <Figure label="Max today" hint={gain > 0 ? `DI +${gain} if you finish all` : 'DI ceiling reached'} last>
          <BoardNumber value={maxToday} className="text-[34px] text-lane-dim sm:text-[44px]" />
        </Figure>
      </div>
    </ResultsBoard>
  );
}

function Figure({ label, hint, children, last }: { label: string; hint: string; children: ReactNode; last?: boolean }) {
  return (
    <div className={last ? 'flex min-w-0 flex-col justify-end px-4 py-4 sm:px-5 sm:py-6' : 'flex min-w-0 flex-col justify-end border-r border-lane-line px-4 py-4 sm:px-5 sm:py-6'}>
      {children}
      <span className="mt-2.5 text-[13px] font-semibold text-lane">{label}</span>
      <span className="text-[12px] leading-snug text-lane-mute">{hint}</span>
    </div>
  );
}

/* Same shape as the board, while the first numbers load. */
export function TodayBoardSkeleton() {
  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-lane-line-strong bg-[#050607] sm:grid-cols-[1.35fr_1fr_1fr_1fr]" aria-busy="true" aria-label="Loading your numbers">
      <div className="col-span-3 flex items-end justify-between border-b border-lane-line px-5 py-5 sm:col-span-1 sm:flex-col sm:items-start sm:border-b-0 sm:border-r sm:px-6 sm:py-6">
        <Skeleton className="h-14 w-28 sm:h-[68px] sm:w-36" />
        <Skeleton className="h-4 w-32 sm:mt-4" />
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} className={i < 2 ? 'border-r border-lane-line px-4 py-4 sm:px-5 sm:py-6' : 'px-4 py-4 sm:px-5 sm:py-6'}>
          <Skeleton className="h-8 w-14 sm:h-10 sm:w-20" />
          <Skeleton className="mt-3 h-3.5 w-16" />
        </div>
      ))}
    </div>
  );
}
