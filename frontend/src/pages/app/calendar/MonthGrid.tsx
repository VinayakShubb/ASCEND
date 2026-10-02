import { useMemo } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { addMonths, endOfMonth, format, getDay, isSameMonth, startOfMonth } from 'date-fns';
import { cn } from '../../../lib/cn';
import { describeDay, fillFor, inkFor, type SeasonDay } from './season';

interface MonthGridProps {
  month: Date;
  onMonthChange: (month: Date) => void;
  days: Map<string, SeasonDay>;
  windowStart: Date;
  windowEnd: Date;
  selected: string;
  onSelect: (date: string) => void;
}

const WEEKDAYS = [
  { short: 'M', long: 'Monday' },
  { short: 'T', long: 'Tuesday' },
  { short: 'W', long: 'Wednesday' },
  { short: 'T', long: 'Thursday' },
  { short: 'F', long: 'Friday' },
  { short: 'S', long: 'Saturday' },
  { short: 'S', long: 'Sunday' },
];

/* Phones: one month at a time, Monday to Sunday, cells big enough to tap. */
export function MonthGrid({ month, onMonthChange, days, windowStart, windowEnd, selected, onSelect }: MonthGridProps) {
  const cells = useMemo(() => {
    const first = startOfMonth(month);
    const lead = (getDay(first) + 6) % 7;
    const count = endOfMonth(month).getDate();
    const list: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= count; d++) list.push(format(new Date(first.getFullYear(), first.getMonth(), d), 'yyyy-MM-dd'));
    return list;
  }, [month]);

  const canPrev = !isSameMonth(month, windowStart) && month > windowStart;
  const canNext = !isSameMonth(month, windowEnd) && month < windowEnd;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-[30px] uppercase" aria-live="polite">
          {format(month, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(month, -1))}
            disabled={!canPrev}
            aria-label="Previous month"
            className="grid size-11 place-items-center rounded-full border border-lane-line-strong text-lane transition-colors hover:bg-night-800 active:scale-95 disabled:opacity-35"
          >
            <CaretLeft className="size-5" weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(month, 1))}
            disabled={!canNext}
            aria-label="Next month"
            className="grid size-11 place-items-center rounded-full border border-lane-line-strong text-lane transition-colors hover:bg-night-800 active:scale-95 disabled:opacity-35"
          >
            <CaretRight className="size-5" weight="bold" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map(w => (
          <abbr key={w.long} title={w.long} className="pb-1 text-center text-[12px] font-semibold text-lane-mute no-underline">
            {w.short}
          </abbr>
        ))}
        {cells.map((date, i) => {
          if (!date) return <span key={`lead-${i}`} aria-hidden />;
          const day = days.get(date);
          const dayNumber = Number(date.slice(8));
          if (!day) {
            // Outside the season window (before your history starts).
            return (
              <span
                key={date}
                className="grid min-h-11 aspect-square place-items-center rounded-lg text-[14px] text-lane-mute/50 tabular"
                aria-label={`${format(new Date(`${date}T00:00:00`), 'MMMM d')}: before your history starts`}
              >
                {dayNumber}
              </span>
            );
          }
          const fill = fillFor(day);
          const isSelected = date === selected;
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              aria-pressed={isSelected}
              aria-label={describeDay(day)}
              className={cn(
                'relative grid min-h-11 aspect-square place-items-center rounded-lg text-[15px] font-semibold tabular transition-[filter] active:scale-95 hover:brightness-125',
                inkFor(day),
                fill ? '' : 'border border-lane-line',
                day.kind === 'today' && 'ring-1 ring-inset ring-lane',
                isSelected && 'outline-2 outline-offset-2 outline-lane',
              )}
              style={{ backgroundColor: fill ?? undefined }}
            >
              {dayNumber}
            </button>
          );
        })}
      </div>
    </div>
  );
}
