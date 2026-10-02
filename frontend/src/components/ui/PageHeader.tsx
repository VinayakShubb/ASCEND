import type { ReactNode } from 'react';

/* Page title in painted condensed type, an optional plain sentence under it,
   and actions on the right. No eyebrow labels. */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 sm:mb-10">
      <div className="min-w-0">
        <h1 className="font-display text-[44px] uppercase sm:text-[56px]">{title}</h1>
        {description && <p className="mt-3 max-w-[60ch] text-[15px] text-lane-dim">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
