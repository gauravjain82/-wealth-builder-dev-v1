/** Small display helpers shared by the metrics components. */

import type { CountMode, MetricsSection, Outcome, OutcomeCounts } from '../types';

export const OUTCOME_LABELS: Record<Outcome, string> = {
  showed: 'Showed up',
  no_show: 'No-show',
  upcoming: 'Upcoming',
  result_pending: 'Form pending',
  not_accepted: 'Trainer not accepted',
  no_trainer: 'No trainer',
  cancelled: 'Cancelled',
};

/**
 * The outcome buckets as charted, in stacking order (best first, cancelled
 * last). "No trainer" and "Trainer not accepted" are drawn as one segment;
 * it only exists for trainer requests. Colours live in the page CSS
 * (`.mm-o--<key>`).
 */
export type OutcomeSegmentKey = 'showed' | 'upcoming' | 'result_pending' | 'unanswered' | 'no_show' | 'cancelled';

export const OUTCOME_SEGMENTS: { key: OutcomeSegmentKey; label: string; trainerOnly?: boolean }[] = [
  { key: 'showed', label: 'Showed up' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'result_pending', label: 'Form pending' },
  { key: 'unanswered', label: 'No trainer / not accepted', trainerOnly: true },
  { key: 'no_show', label: 'No-show' },
  { key: 'cancelled', label: 'Cancelled' },
];

export function segmentsFor(section: MetricsSection) {
  return OUTCOME_SEGMENTS.filter((segment) => !segment.trainerOnly || section === 'REQUEST_TRAINER');
}

export function segmentValue(counts: OutcomeCounts, key: OutcomeSegmentKey): number {
  return key === 'unanswered' ? counts.no_trainer + counts.not_accepted : counts[key];
}

/** "1 prospect" / "3 appointments". */
export function unitCount(count: number, mode: CountMode): string {
  const noun = mode === 'prospects' ? 'prospect' : 'appointment';
  return `${count.toLocaleString()} ${noun}${count === 1 ? '' : 's'}`;
}

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
