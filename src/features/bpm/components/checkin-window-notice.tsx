import { Clock } from 'lucide-react';
import type { BPMOccurrence } from '../types';
import { formatOccurrenceTime } from '../services/bpm-service';

/**
 * The banner shown when check-in for the selected date has not opened yet.
 *
 * The window is resolved server-side and arrives on the occurrence as
 * `checkin_open` / `checkin_opens_at` — deliberately, so the rule exists in one
 * place. Re-deriving it here from `start_at` and the configured hours would put
 * the same rule on both sides of the wire, where it would eventually drift.
 *
 * The window only ever **opens**: nothing closes it when the event ends, so a
 * name typed wrong at the door can still be fixed the next morning. That is the
 * same reasoning that keeps ARCHIVED and HIDDEN out of `CLOSED_TO_GUESTS`.
 */
export function CheckinWindowNotice({ occurrence }: { occurrence: BPMOccurrence | null }) {
  if (!occurrence || occurrence.checkin_open) return null;

  return (
    <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-400/30 dark:bg-amber-400/10">
      <Clock size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />
      <div>
        <div className="font-medium text-amber-800 dark:text-amber-200">
          Check-in is not open yet
        </div>
        <div className="text-amber-700 dark:text-amber-200/80">
          {occurrence.checkin_opens_at
            ? `It opens at ${formatOccurrenceTime(occurrence.checkin_opens_at)}.`
            : 'It is not open for this date yet.'}{' '}
          You can still work the list; only checking people in is held back.
        </div>
      </div>
    </div>
  );
}
