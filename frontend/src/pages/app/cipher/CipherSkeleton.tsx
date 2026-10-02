import { Skeleton } from '../../../components/ui/Feedback';

/* Placeholder in the shape of the report: board and verdict, baselines, then
   the first rows of the plan. */
export function CipherSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading analysis" role="status">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-12">
        <Skeleton className="h-[330px] rounded-2xl" />
        <div className="flex flex-col gap-3 lg:pt-2">
          <Skeleton className="h-11 w-11/12" />
          <Skeleton className="h-11 w-2/3" />
          <Skeleton className="mt-3 h-4 w-full max-w-[60ch]" />
          <Skeleton className="h-4 w-5/6 max-w-[56ch]" />
          <Skeleton className="mt-4 h-4 w-3/4" />
        </div>
      </div>
      <div className="mt-10 grid border-y border-lane-line md:grid-cols-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex flex-col gap-3 py-5 md:px-6 md:first:pl-0">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-3.5 w-full" />
          </div>
        ))}
      </div>
      <div className="mt-10">
        <Skeleton className="h-9 w-64" />
        {[0, 1, 2].map(i => (
          <div key={i} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-6 border-b border-lane-line py-5">
            <Skeleton className="h-10 w-8" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
