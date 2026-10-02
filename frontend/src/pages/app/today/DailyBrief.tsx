import { Skeleton } from '../../../components/ui/Feedback';
import { useDailyBrief } from './useTodayData';

/* The daily brief as one quiet line under the board. If it fails, the line
   simply isn't there: nothing on Today depends on it. */
export function DailyBrief({ enabled }: { enabled: boolean }) {
  const brief = useDailyBrief(enabled);

  if (brief.state === 'loading') {
    return (
      <div className="mt-5 flex flex-col gap-2" aria-busy="true" aria-label="Loading today's brief">
        <Skeleton className="h-4 w-11/12 max-w-[560px]" />
        <Skeleton className="h-4 w-2/3 max-w-[380px]" />
      </div>
    );
  }
  if (brief.state !== 'ready') return null;

  const motivation = brief.value.motivation.replace(/\s*\n+\s*/g, ' ').trim();
  return (
    <p className="mt-5 max-w-[72ch] text-[15px] leading-relaxed">
      <q className="font-semibold text-lane">{brief.value.quote.replace(/^["“]|["”]$/g, '')}</q>
      {motivation && <span className="text-lane-dim"> {motivation}</span>}
    </p>
  );
}
