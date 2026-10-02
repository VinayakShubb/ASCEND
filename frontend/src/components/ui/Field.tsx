import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string | null;
  trailing?: ReactNode;
}

/* Label above, input, then hint or error below. Never placeholder-as-label. */
export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, hint, error, trailing, className, id, ...props }, ref) => {
    const generated = useId();
    const inputId = id ?? generated;
    const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-[13px] font-medium text-lane-dim">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              'h-12 w-full rounded-xl border bg-night-900 px-4 text-[15px] text-lane outline-none',
              'placeholder:text-lane-mute transition-[border-color,background-color] duration-200',
              'focus:border-lane-dim focus:bg-night-850',
              error ? 'border-dnf/70' : 'border-lane-line-strong',
              trailing ? 'pr-12' : '',
              className,
            )}
            {...props}
          />
          {trailing && <div className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</div>}
        </div>
        {error ? (
          <p id={`${inputId}-error`} className="text-[13px] text-dnf" role="alert">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="text-[13px] text-lane-mute">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
Field.displayName = 'Field';
