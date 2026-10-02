import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/* Shimmering placeholder in the shape of the content that is loading. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-lg bg-night-800', className)} aria-hidden />;
}

/* Empty state: says what is missing and how to fill it. */
export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-start gap-3 border-y border-lane-line py-10', className)}>
      <h3 className="font-display text-[30px] uppercase">{title}</h3>
      <p className="max-w-[52ch] text-[15px] text-lane-dim">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* Inline error with a way forward. */
export function InlineError({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dnf/35 bg-dnf/[0.07] px-4 py-3 text-[14px] text-[#f3b3a7]">
      <span>{message}</span>
      {action}
    </div>
  );
}
