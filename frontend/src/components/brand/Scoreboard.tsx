import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { duration, ease } from '../../design/motion';
import { cn } from '../../lib/cn';

/* A number on the results board: dot-matrix figures in fixed cells. When the
   value changes, only the digits that changed roll to the new figure, like a
   stadium board updating. */
export function BoardNumber({
  value,
  pad = 0,
  className,
  flipOnMount = false,
  mountDelay = 0,
}: {
  value: number | string;
  /* Minimum number of cells (left-padded with blanks). */
  pad?: number;
  className?: string;
  flipOnMount?: boolean;
  mountDelay?: number;
}) {
  const text = String(value).padStart(pad, ' ');
  return (
    <span className={cn('inline-flex font-board font-bold leading-none tabular', className)} aria-label={String(value)} role="img">
      {text.split('').map((char, i) => (
        <DigitCell key={i} char={char} flipOnMount={flipOnMount} delay={mountDelay + i * 0.07} />
      ))}
    </span>
  );
}

function DigitCell({ char, flipOnMount, delay }: { char: string; flipOnMount: boolean; delay: number }) {
  const reduce = useReducedMotion();
  return (
    <span aria-hidden className="relative inline-block h-[1em] w-[0.72em] overflow-hidden">
      <AnimatePresence initial={flipOnMount && !reduce} mode="popLayout">
        <motion.span
          key={char}
          className="absolute inset-0 grid place-items-center"
          initial={reduce ? false : { y: '-105%', opacity: 0.2 }}
          animate={{ y: 0, opacity: 1, transition: { duration: duration.base, ease: ease.out, delay: flipOnMount ? delay : 0 } }}
          exit={reduce ? undefined : { y: '105%', opacity: 0.2, transition: { duration: duration.fast, ease: ease.quart } }}
        >
          {char === ' ' ? '' : char}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* The results board panel: a matte LED panel with a faint dot grid. */
export function ResultsBoard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-lane-line-strong bg-[#050607]',
        'shadow-[0_18px_40px_-18px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(238_234_226/0.06)]',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{ backgroundImage: 'radial-gradient(rgb(238 234 226 / 0.5) 0.6px, transparent 0.7px)', backgroundSize: '5px 5px' }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
