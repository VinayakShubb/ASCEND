import { useId } from 'react';
import { cn } from '../../lib/cn';

interface Option<T extends string> {
  value: T;
  label: string;
  detail?: string;
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}

/* A radio group drawn as a segmented control (e.g. habit difficulty). */
export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  const id = useId();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[13px] font-medium text-lane-dim">{label}</legend>
      <div className="grid gap-1.5 rounded-2xl border border-lane-line-strong bg-night-950 p-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map(option => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                'relative flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-xl px-2 py-1.5 text-center transition-colors duration-200',
                checked ? 'bg-lane text-night-950' : 'text-lane-dim hover:bg-night-800 hover:text-lane',
              )}
            >
              <input
                type="radio"
                name={id}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span className="text-[13px] font-semibold">{option.label}</span>
              {option.detail && (
                <span className={cn('tabular text-[11px]', checked ? 'text-night-700' : 'text-lane-mute')}>{option.detail}</span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
