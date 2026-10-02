import type { CipherStatus } from '../lib/api';

export const STATUS_META: Record<CipherStatus, { label: string; color: string; text: string }> = {
  elite: { label: 'Elite', color: 'var(--color-infield)', text: 'text-infield' },
  solid: { label: 'Solid', color: 'var(--color-infield)', text: 'text-infield' },
  slipping: { label: 'Slipping', color: 'var(--color-amber)', text: 'text-amber' },
  critical: { label: 'Critical', color: 'var(--color-dnf)', text: 'text-dnf' },
};

/* Status from the Discipline Index bands: 80+ elite, 50+ solid, 20+ slipping. */
export function statusFromIndex(index: number): CipherStatus {
  if (index >= 80) return 'elite';
  if (index >= 50) return 'solid';
  if (index >= 20) return 'slipping';
  return 'critical';
}
