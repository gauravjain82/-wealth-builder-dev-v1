/** Weekly series for the sparklines, built from the trend endpoint's aligned arrays. */

import { MIN_SAMPLE } from './format';

/** One week of a sparkline. */
export interface SparkPoint {
  /** null = a gap: a rate with nothing booked that week (never drawn as 0). */
  value: number | null;
  /** Booked that week. */
  total: number;
  /** Tooltip counts, e.g. "48 of 71 showed". */
  detail: string;
  /** Too few booked for the rate to mean much: drawn hollow. */
  small: boolean;
  /** A large share still upcoming / form pending: drawn dashed, its rate may still rise. */
  unsettled: boolean;
}

/** Share of a week still upcoming or waiting on a form above which it counts as unsettled. */
export const UNSETTLED_SHARE = 0.2;

/**
 * Weekly `part / total`, e.g. show rate. Weeks with nothing booked are gaps;
 * `pending` (upcoming + form pending per week) marks unsettled weeks when
 * the series has it — the rows' series do not.
 */
export function rateSeries(totals: number[], parts: number[], verb: string, pending?: number[]): SparkPoint[] {
  return totals.map((total, index) => {
    const part = parts[index] ?? 0;
    return {
      value: total ? part / total : null,
      total,
      detail: total ? `${part.toLocaleString()} of ${total.toLocaleString()} ${verb}` : 'Nothing booked',
      small: total > 0 && total < MIN_SAMPLE,
      unsettled: Boolean(total && pending && (pending[index] ?? 0) / total >= UNSETTLED_SHARE),
    };
  });
}

/** Weekly counts, e.g. booked. A count of 0 is a real value, not a gap. */
export function countSeries(totals: number[], noun: string): SparkPoint[] {
  return totals.map((total) => ({
    value: total,
    total,
    detail: `${total.toLocaleString()} ${noun}`,
    small: false,
    unsettled: false,
  }));
}
