import { motion, useReducedMotion } from 'motion/react';
import { duration, ease } from '../../design/motion';
import { cn } from '../../lib/cn';

const LANES = [1, 2, 3, 4, 5, 6];

/* A stretch of tartan track seen from the stands: painted lane lines, a
   staggered start (outer lanes start further ahead) and painted lane
   numerals. Phones get four lanes as a strip under the form; laptops get
   six lanes filling the right side, with the line from the landing page
   painted across them. Its one moment: the lines get painted on arrival. */
export function TrackField({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const paint = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { scaleX: 0 },
          animate: { scaleX: 1 },
          transition: { duration: duration.slow * 1.6, ease: ease.out, delay },
        };

  return (
    <div
      aria-hidden
      className={cn('tartan relative flex flex-col overflow-hidden select-none', className)}
      style={{ containerType: 'size' }}
    >
      {LANES.map((lane, i) => {
        /* Stagger: each lane's start line sits a little further along. */
        const start = 13 + i * 3.2;
        return (
          <div
            key={lane}
            className={cn('relative min-h-0 flex-1', lane > 4 && 'max-lg:hidden')}
            style={{ containerType: 'size' }}
          >
            <motion.span
              className="absolute inset-x-0 top-0 h-[2px] origin-left bg-lane/80 lg:h-[3px]"
              {...paint(i * 0.06)}
            />
            <div className="absolute inset-y-0" style={{ left: `${start}%` }}>
              <motion.span
                className="absolute inset-y-0 left-0 w-[2px] origin-top bg-lane/85 lg:w-[3px]"
                {...(reduce
                  ? {}
                  : {
                      initial: { scaleY: 0 },
                      animate: { scaleY: 1 },
                      transition: { duration: duration.base, ease: ease.out, delay: 0.35 + i * 0.05 },
                    })}
              />
              <span className="font-display absolute right-full top-1/2 -translate-y-1/2 pr-[0.22em] text-[28px] text-lane/90 lg:text-[length:74cqh]">
                {lane}
              </span>
            </div>
          </div>
        );
      })}
      <motion.span className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-lane/80 lg:h-[3px]" {...paint(0.36)} />

      {/* The landing page's line, painted across the outer lanes. */}
      <p className="font-display absolute bottom-[7cqh] right-[6cqw] hidden text-right text-[length:min(10.5cqw,15cqh)] uppercase leading-[0.86] text-lane/90 lg:block">
        Discipline,
        <br />
        scored.
      </p>

      {/* Floodlight falling from the top corner; the stands' shadow at the near edge. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(70% 55% at 88% -12%, rgb(255 244 236 / 0.13), transparent 70%), linear-gradient(180deg, transparent 55%, rgb(8 9 11 / 0.28)), linear-gradient(90deg, rgb(8 9 11 / 0.3), transparent 14%)',
        }}
      />
    </div>
  );
}
