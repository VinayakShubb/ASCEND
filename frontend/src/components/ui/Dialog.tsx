import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/* Centred on laptops, a bottom sheet on phones (thumb reach). */
export function Dialog({ open, onOpenChange, title, description, children, className }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="dialog-overlay fixed inset-0 z-50 bg-night-950/75" />
        <RadixDialog.Content
          className={cn(
            'dialog-content fixed z-50 flex max-h-[92dvh] w-full flex-col overflow-y-auto border border-lane-line-strong bg-night-900 p-6 shadow-[0_24px_60px_-12px_rgb(0_0_0/0.7)]',
            'bottom-0 left-0 rounded-t-3xl pb-[max(1.5rem,env(safe-area-inset-bottom))]',
            'sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:pb-6',
            className,
          )}
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <RadixDialog.Title className="font-display text-[28px] uppercase leading-none">{title}</RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="mt-2 text-[14px] text-lane-dim">{description}</RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close
              className="-mr-2 -mt-1 grid size-11 place-items-center rounded-full text-lane-dim transition-colors hover:bg-night-800 hover:text-lane"
              aria-label="Close"
            >
              <X className="size-5" />
            </RadixDialog.Close>
          </div>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
