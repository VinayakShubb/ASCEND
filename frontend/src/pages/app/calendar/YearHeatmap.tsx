import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { addDays, differenceInCalendarWeeks, format, getDay, parseISO } from 'date-fns';
import { motion, useReducedMotion } from 'motion/react';
import { duration, ease } from '../../../design/motion';
import { cn } from '../../../lib/cn';
import { describeDay, fillFor, type SeasonDay } from './season';

interface YearHeatmapProps {
  days: SeasonDay[];
  selected: string;
  onSelect: (date: string) => void;
}

const WEEKDAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

/* The season at a glance: one column per week (Monday on top), one cell per
   day. Arrow keys move the selection (up/down a day, left/right a week); a
   mouse gets a readout on hover, but every value is also in the day panel. */
export function YearHeatmap({ days, selected, onSelect }: YearHeatmapProps) {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ day: SeasonDay; x: number; y: number; width: number } | null>(null);

  const layout = useMemo(() => {
    const start = days[0].day;
    const cells = days.map(day => ({
      day,
      col: differenceInCalendarWeeks(day.day, start, { weekStartsOn: 1 }),
      row: (getDay(day.day) + 6) % 7,
    }));
    const cols = cells[cells.length - 1].col + 1;

    // A month label sits over the first week that contains the month's 1st.
    // The window's opening month is labelled at column 0 unless the next
    // month starts too close to fit both.
    const labels: { col: number; text: string }[] = [];
    for (const c of cells) {
      if (c.day.day.getDate() === 1) labels.push({ col: c.row === 0 ? c.col : c.col + 1, text: format(c.day.day, 'MMM') });
    }
    if (!labels.length || labels[0].col >= 3) labels.unshift({ col: 0, text: format(start, 'MMM') });
    return { cells, cols, labels: labels.filter(l => l.col < cols) };
  }, [days]);

  const byDate = useMemo(() => new Set(days.map(d => d.date)), [days]);

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = format(addDays(parseISO(selected), step), 'yyyy-MM-dd');
    if (!byDate.has(next)) return;
    onSelect(next);
    wrapRef.current?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)?.focus();
  };

  const showHover = (event: PointerEvent<HTMLButtonElement>, day: SeasonDay) => {
    if (event.pointerType !== 'mouse' || !wrapRef.current) return;
    const box = wrapRef.current.getBoundingClientRect();
    const cell = event.currentTarget.getBoundingClientRect();
    setHover({ day, x: cell.left - box.left + cell.width / 2, y: cell.top - box.top, width: box.width });
  };

  return (
    <div ref={wrapRef} className="relative" onPointerLeave={() => setHover(null)}>
      <motion.div
        role="group"
        aria-label="Season record, one square per day. Use the arrow keys to move between days."
        onKeyDown={move}
        initial={reduce ? false : { clipPath: 'inset(0 100% 0 0)' }}
        animate={{ clipPath: 'inset(0 0% 0 0)' }}
        transition={{ duration: 1.1, ease: ease.out, delay: duration.fast }}
        className="grid gap-[3px] xl:gap-1"
        style={{
          gridTemplateColumns: `2.25rem repeat(${layout.cols}, minmax(0, 1fr))`,
          gridTemplateRows: 'auto repeat(7, auto)',
        }}
      >
        {layout.labels.map(label => (
          <span
            key={`${label.text}-${label.col}`}
            aria-hidden
            className="whitespace-nowrap pb-1.5 text-[12px] font-medium text-lane-mute"
            style={{ gridRow: 1, gridColumn: `${label.col + 2} / span 4` }}
          >
            {label.text}
          </span>
        ))}
        {WEEKDAY_LABELS.map((label, row) =>
          label ? (
            <span
              key={label}
              aria-hidden
              className="self-center text-[11px] font-medium leading-none text-lane-mute"
              style={{ gridRow: row + 2, gridColumn: 1 }}
            >
              {label}
            </span>
          ) : null,
        )}
        {layout.cells.map(({ day, col, row }) => {
          const fill = fillFor(day);
          const isSelected = day.date === selected;
          return (
            <button
              key={day.date}
              type="button"
              data-date={day.date}
              tabIndex={isSelected ? 0 : -1}
              aria-pressed={isSelected}
              aria-label={describeDay(day)}
              onClick={() => onSelect(day.date)}
              onPointerEnter={event => showHover(event, day)}
              className={cn(
                'relative aspect-square w-full rounded-[3px] transition-[filter,outline-color] duration-150 hover:brightness-125',
                fill ? '' : 'border border-lane-line',
                day.kind === 'today' && 'ring-1 ring-inset ring-lane',
                isSelected && 'outline-2 outline-offset-2 outline-lane',
              )}
              style={{ gridRow: row + 2, gridColumn: col + 2, backgroundColor: fill ?? undefined }}
            />
          );
        })}
      </motion.div>

      {hover && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-lane-line-strong bg-night-850 px-3 py-2 shadow-[0_10px_24px_-8px_rgb(0_0_0/0.8)]"
          style={{ left: Math.min(Math.max(hover.x, 80), hover.width - 80), top: hover.y - 8 }}
        >
          <HoverReadout day={hover.day} />
        </div>
      )}
    </div>
  );
}

function HoverReadout({ day }: { day: SeasonDay }) {
  const date = format(day.day, 'EEE, MMM d');
  if (day.kind === 'future') {
    return (
      <p className="text-[13px] text-lane-dim">
        <span className="font-semibold text-lane">{date}</span> not reached yet
      </p>
    );
  }
  return (
    <p className="flex items-baseline gap-2 text-[13px] text-lane-dim">
      <span className="font-display text-[20px] text-lane">{day.score ?? 0}</span>
      <span>score</span>
      <span className="tabular">{day.completion ?? 0}% done</span>
      <span className="text-lane-mute">{date}</span>
    </p>
  );
}
