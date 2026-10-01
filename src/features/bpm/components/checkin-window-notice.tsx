import { Clock, LockKeyhole } from 'lucide-react';
import type { BPMOccurrence } from '../types';
import { formatOccurrenceTime } from '../services/bpm-service';
import { checkinWindowState } from './checkin-window';

interface CheckinWindowNoticeProps {
  occurrence: BPMOccurrence | null;
  /**
   * The viewer holds `can_checkin_after_close`. Only changes the wording of the
   * closed state — the page decides what is actually enabled.
   */
  canCheckinAfterClose?: boolean;
}

/**
 * The banner shown when check-in for the selected date is not open: either not
 * yet, or no longer.
 *
 * The window is resolved server-side and arrives on the occurrence as
 * `checkin_open` / `checkin_closed` / `checkin_opens_at` / `checkin_closes_at` —
 * deliberately, so the rule exists in one place. Re-deriving it here from
 * `start_at` and the configured hours would put the same rule on both sides of
 * the wire, where it would eventually drift.
 *
 * The window closes `checkin_close_hours` after the BPM ends. After that only a
 * BPM manager can check people in, so a name typed wrong at the door can still
 * be fixed the next morning by somebody who is accountable for it; undo stays
 * open to everybody.
 */
export function CheckinWindowNotice({ occurrence, canCheckinAfterClose = false }: CheckinWindowNoticeProps) {
  const state = checkinWindowState(occurrence);
  if (!occurrence || state === null) return null;

  if (state === 'closed') {
    return (
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm dark:border-white/15 dark:bg-white/5">
        <LockKeyhole size={16} className="mt-0.5 shrink-0 text-slate-500 dark:text-white/60" />
        <div>
          <div className="font-medium text-slate-800 dark:text-white">Check-in has closed</div>
          <div className="text-slate-600 dark:text-white/70">
            {canCheckinAfterClose
              ? 'As a BPM manager you can still check people in.'
              : occurrence.checkin_closes_at
                ? `Check-in closed at ${formatOccurrenceTime(occurrence.checkin_closes_at)}. Ask a BPM manager to check anybody else in.`
                : 'Check-in has closed for this date. Ask a BPM manager to check anybody else in.'}{' '}
            Undoing a check-in is still available.
          </div>
        </div>
      </div>
    );
  }

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
