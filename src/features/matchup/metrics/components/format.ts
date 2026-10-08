/** Small display helpers shared by the metrics components. */

import type { Outcome } from '../types';

export const OUTCOME_LABELS: Record<Outcome, string> = {
  showed: 'Showed up',
  no_show: 'No-show',
  upcoming: 'Upcoming',
  result_pending: 'Form pending',
  not_accepted: 'Trainer not accepted',
  no_trainer: 'No trainer',
  cancelled: 'Cancelled',
};

/** Ratio as a whole percent, or an em dash when there is no denominator. */
export function percent(part: number, whole: number): string {
  if (!whole) return '—';
  return `${Math.round((part / whole) * 100)}%`;
}

/** A backend rate (0..1 or null) as a whole percent. */
export function rate(value: number | null): string {
  return value == null ? '—' : `${Math.round(value * 100)}%`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}
