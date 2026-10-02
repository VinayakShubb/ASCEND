import type { Variants } from 'motion/react';
import type { CipherHabit } from '../../../lib/api';
import { duration, ease } from '../../../design/motion';

/* "+4.1 DI" for small gains, "+9 DI" once it is a whole point or more. */
export const formatImpact = (impact: number) => `+${impact >= 1 ? Math.round(impact) : impact.toFixed(1)} DI`;

export function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export const personalityName = (type: string) => (type === 'CALIBRATING' ? 'Calibrating' : type.toLowerCase());

/* Habit status chips: on track green, building amber, slipping red. */
export const HABIT_STATUS: Record<CipherHabit['status'], { text: string; color: string }> = {
  'on track': { text: 'text-infield', color: 'var(--color-infield)' },
  building: { text: 'text-amber', color: 'var(--color-amber)' },
  slipping: { text: 'text-dnf', color: 'var(--color-dnf)' },
};

/* The one authored arrival: the board settles first, then each section of the
   report steps in after it, like results posting down the board. */
export const reportGroup = (delay: number): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: delay } },
});

export const reportItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: duration.slow, ease: ease.out } },
};
