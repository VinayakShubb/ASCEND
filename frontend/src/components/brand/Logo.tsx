import { cn } from '../../lib/cn';

/* The line-art "A" monogram plus the painted wordmark. The mark is a white
   line-art glyph on transparent ground, so it sits directly on the dark
   chrome with no box or ring. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <img src="/logo-mark.png" alt="" width={36} height={36} className="size-9 shrink-0 object-contain" />
      {!compact && <span className="font-display text-[23px] uppercase leading-none tracking-[0.04em]">Ascend</span>}
      {compact && <span className="sr-only">Ascend</span>}
    </span>
  );
}
