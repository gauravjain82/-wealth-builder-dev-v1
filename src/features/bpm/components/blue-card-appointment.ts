import { formatOccurrenceTime } from '../services/bpm-service';
import type { BPMGuest, BPMOccurrence } from '../types';

/** "Tuesday BPM · Tue 14 Oct, 7:00 PM", for the appointment's auto-note. */
function eventDetails(occurrence: BPMOccurrence | null | undefined): string {
  if (!occurrence) return 'a BPM';
  return `${occurrence.event_name} · ${formatOccurrenceTime(occurrence.start_at)}`;
}

/**
 * Prefill for the 1-on-1 booked off a blue card (D3).
 *
 * `trainee` is the **inviter**, not the logged-in user: the person who brought
 * the guest is who the follow-up belongs to, even when somebody else is at the
 * keyboard taking the card at the door.
 *
 * Shared by the Schedule appointment button inside the blue card and the one on
 * each Guest Check-In row — the two open the same form and must not prefill it
 * differently. A module of its own so both component files stay components-only.
 */
export function blueCardAppointmentValues(
  guest: BPMGuest | null,
  occurrence: BPMOccurrence | null | undefined,
  stepOneTypeId: number | null,
) {
  return {
    kind: 'REQUEST_TRAINER' as const,
    contact: guest?.prospect ?? null,
    contactLabel: guest?.prospect_detail?.name ?? '',
    trainee: guest?.inviter ?? null,
    traineeLabel: guest?.inviter_name ?? '',
    // Looked up by slug, because ids differ per environment and renaming the
    // type in admin must not silently stop the box being ticked.
    types: stepOneTypeId ? [stepOneTypeId] : [],
    notes: `Blue Card follow up from ${eventDetails(occurrence)}`,
  };
}
