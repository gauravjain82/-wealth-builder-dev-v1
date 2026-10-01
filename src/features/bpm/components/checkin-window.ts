import type { BPMOccurrence } from '../types';

/**
 * The check-in window, as the check-in pages need to act on it.
 *
 * Kept out of `checkin-window-notice.tsx` so that file exports only its
 * component (Fast Refresh). Both check-in pages import from here to decide what
 * is enabled, and render `CheckinWindowNotice` to explain it.
 */

/** Which side of the check-in window a date is on, or null when it is open. */
export type CheckinWindowState = 'not_open' | 'closed' | null;

/**
 * Where the selected date sits relative to its check-in window.
 *
 * Read straight off the occurrence: `checkin_closed` first, because a closed
 * date also reports `checkin_open === false` and must not be mistaken for one
 * that has not opened yet.
 */
export function checkinWindowState(occurrence: BPMOccurrence | null): CheckinWindowState {
  if (!occurrence) return null;
  if (occurrence.checkin_closed) return 'closed';
  if (!occurrence.checkin_open) return 'not_open';
  return null;
}

/**
 * Whether this user may check somebody in on this date right now.
 *
 * Open → everybody. Closed → only a BPM manager (`can_checkin_after_close`).
 * Not yet open → nobody. Undo is never gated by this; the check-in pages keep
 * it available whatever the window says.
 */
export function canCheckInNow(
  occurrence: BPMOccurrence | null,
  canCheckinAfterClose = false,
): boolean {
  const state = checkinWindowState(occurrence);
  if (state === 'closed') return canCheckinAfterClose;
  return state === null && Boolean(occurrence);
}
