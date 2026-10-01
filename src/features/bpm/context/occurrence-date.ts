import type { BPMOccurrence } from '../types';

/**
 * The occurrence's calendar date where it happens, as `YYYY-MM-DD`.
 *
 * "The same date" means the same date *at the event*, not in the viewer's
 * timezone — an evening BPM must not split into two days for a viewer abroad.
 */
export function occurrenceLocalDate(occurrence: BPMOccurrence): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: occurrence.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(occurrence.start_at));
  } catch {
    return occurrence.start_at.slice(0, 10);
  }
}
