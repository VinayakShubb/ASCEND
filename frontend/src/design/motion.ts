/* One motion vocabulary for the whole product. Everything eases out fast and
   settles: a sprinter's finish, never a bounce. Use these instead of ad-hoc
   durations so the app moves as one system. */
import type { Transition } from 'motion/react';

export const ease = {
  out: [0.16, 1, 0.3, 1] as const, // expo out: entrances, reveals
  quart: [0.25, 1, 0.5, 1] as const, // smaller UI changes
};

export const duration = {
  instant: 0.12,
  fast: 0.2,
  base: 0.32,
  slow: 0.55,
  page: 0.42,
};

/* Tactile press on buttons and checks. */
export const press: Transition = { type: 'spring', stiffness: 520, damping: 34, mass: 0.6 };

/* Layout shifts (list reorder, expanding rows). */
export const settle: Transition = { type: 'spring', stiffness: 380, damping: 36 };

/* Standard reveal: content is visible by default; this only adds the arrival. */
export const reveal = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: duration.slow, ease: ease.out },
};

/* Stagger children inside a list reveal. */
export const stagger = (step = 0.04, delay = 0) => ({
  animate: { transition: { staggerChildren: step, delayChildren: delay } },
});
