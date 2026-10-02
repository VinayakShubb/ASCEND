import type { Difficulty } from '../types';

/* Difficulty multipliers, as used by the backend scoring. */
export const WEIGHT_VALUE: Record<Difficulty, number> = { easy: 1.0, medium: 1.2, hard: 1.5, extreme: 2.0 };
export const WEIGHT: Record<Difficulty, string> = { easy: '1.0×', medium: '1.2×', hard: '1.5×', extreme: '2.0×' };

export const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; detail: string }[] = [
  { value: 'easy', label: 'Easy', detail: '1.0×' },
  { value: 'medium', label: 'Medium', detail: '1.2×' },
  { value: 'hard', label: 'Hard', detail: '1.5×' },
  { value: 'extreme', label: 'Extreme', detail: '2.0×' },
];
