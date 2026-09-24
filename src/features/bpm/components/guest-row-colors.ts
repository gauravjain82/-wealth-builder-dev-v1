import { BPM_GUEST_STATE } from '@shared/components/row-colors';
import type { BPMGuest } from '../types';

/**
 * Which colour rules are active for one guest row.
 *
 * The single mapping from a guest to its colour keys, shared by Guest Invites
 * (`guest-list.tsx`) and Guest Check-In (`guest-checkin-table.tsx`). It lives in
 * a module of its own rather than in either table because two mappings is how
 * the two lists would end up disagreeing about what a colour means.
 *
 * Note the distinction the brief draws between wanting to reschedule and having
 * been rescheduled: `reschedule` alone is an intention recorded against the
 * guest, while `rescheduled` means a destination BPM or 1-on-1 was actually
 * created. They are different colours, so only one of the two keys is ever on.
 */
export function guestStateKeys(guest: BPMGuest) {
  return [
    guest.rescheduled && BPM_GUEST_STATE.RESCHEDULED,
    guest.confirmed && BPM_GUEST_STATE.CONFIRMED,
    guest.not_interested && BPM_GUEST_STATE.NOT_INTERESTED,
    guest.reschedule && !guest.rescheduled && BPM_GUEST_STATE.RESCHEDULE_REQUESTED,
    (guest.called || guest.left_message) && BPM_GUEST_STATE.CONTACTED,
    // Two sources for one colour: the flag is the Guest Check-In outcome, the
    // linked appointment is the blue card having actually booked one. Saving a
    // card sets the flag, but a row that predates the flag still has the link.
    (guest.scheduled_appointment || Boolean(guest.followup?.appointment)) &&
      BPM_GUEST_STATE.APPOINTMENT_SCHEDULED,
  ];
}
