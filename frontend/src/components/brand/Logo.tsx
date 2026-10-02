import { cn } from '../../lib/cn';

/* The line-art "A" monogram plus the painted wordmark. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <img src="/ascend.jpg" alt="" width={28} height={28} className="size-7 rounded-[7px] ring-1 ring-lane-line-strong" />
      {!compact && <span className="font-display text-[22px] uppercase leading-none tracking-[0.04em]">Ascend</span>}
      {compact && <span className="sr-only">Ascend</span>}
    </span>
  );
}
