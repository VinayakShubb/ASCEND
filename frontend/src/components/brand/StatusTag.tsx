import type { CipherStatus } from '../../lib/api';
import { STATUS_META } from '../../design/status';
import { cn } from '../../lib/cn';

export function StatusTag({ status, className }: { status: CipherStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold', meta.text, className)}
      style={{ backgroundColor: `color-mix(in srgb, ${meta.color} 14%, transparent)` }}
    >
      {meta.label}
    </span>
  );
}
