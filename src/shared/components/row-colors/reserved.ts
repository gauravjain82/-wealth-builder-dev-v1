import type { RowColorCondition, RowColorRule } from './types';

/**
 * Reserved default row colours.
 *
 * These are the schemes the BPM brief specifies by name.
 *
 * **Since Phase 7 the server owns them.** They are seeded as `BPMRowColorRule`
 * rows (migration `bpm/0020`) with the same keys and hexes, so an admin can
 * recolour or disable a built-in scheme from BPM Settings exactly as they would
 * one of their own. This constant is kept as the **fallback** a BPM list falls
 * back to when the rule fetch fails — a permanently uncoloured list would be a
 * silent regression — and as the definition of what "reserved" means to
 * `isHexAvailable` for any consumer not reading the server set.
 *
 * Because the built-ins are now rows, the uniqueness rule enforces itself: a
 * reserved colour is simply a colour a rule already holds, so passing the whole
 * server set to `isHexAvailable` covers both cases in one comparison.
 */

/** Condition keys for BPM guest rows. Exported so call sites cannot typo them. */
export const BPM_GUEST_STATE = {
  /** Guest was actually moved on — to another BPM, or to a 1-on-1 appointment. */
  RESCHEDULED: 'bpm.guest.rescheduled',
  /** Someone ticked "Confirmed": we expect this person to turn up. */
  CONFIRMED: 'bpm.guest.confirmed',
  /** Outcome says they want to reschedule, but no reschedule was actually made. */
  RESCHEDULE_REQUESTED: 'bpm.guest.reschedule_requested',
  /** Outcome: not interested. */
  NOT_INTERESTED: 'bpm.guest.not_interested',
  /** Outcome: called and/or left a message — contact made, nothing moved. */
  CONTACTED: 'bpm.guest.contacted',
  /** A blue card was saved with an appointment booked off it. */
  APPOINTMENT_SCHEDULED: 'bpm.guest.appointment_scheduled',
} as const;

/** Where every BPM guest condition is reported. */
const BPM_GUEST_ROWS = 'Guest Invites and Guest Check-In rows';

/**
 * Every condition key the BPM guest lists report, for the settings editor.
 *
 * Must match `guestStateKeys` in `features/bpm/components/guest-row-colors.ts`,
 * which is the one place a guest is mapped to these keys. A key added there
 * belongs here too, or it cannot be picked for a rule.
 */
export const BPM_GUEST_CONDITIONS: RowColorCondition[] = [
  {
    key: BPM_GUEST_STATE.RESCHEDULED,
    label: 'Rescheduled',
    description:
      'The guest was actually moved on from this BPM — to another BPM date, or to a 1-on-1 appointment.',
    appearsIn: BPM_GUEST_ROWS,
  },
  {
    key: BPM_GUEST_STATE.CONFIRMED,
    label: 'Confirmed',
    description: 'Somebody ticked Confirmed on the guest: they are expected to turn up.',
    appearsIn: BPM_GUEST_ROWS,
  },
  {
    key: BPM_GUEST_STATE.NOT_INTERESTED,
    label: 'Not interested',
    description: "The guest's outcome is recorded as Not interested.",
    appearsIn: BPM_GUEST_ROWS,
  },
  {
    key: BPM_GUEST_STATE.RESCHEDULE_REQUESTED,
    label: 'Wants to reschedule',
    description:
      'The outcome says the guest wants to reschedule, but no new BPM date or appointment has been booked yet.',
    appearsIn: BPM_GUEST_ROWS,
  },
  {
    key: BPM_GUEST_STATE.CONTACTED,
    label: 'Called / left message',
    description:
      'Called or Left message is ticked on the guest — contact was made, but nothing has moved yet.',
    appearsIn: BPM_GUEST_ROWS,
  },
  {
    key: BPM_GUEST_STATE.APPOINTMENT_SCHEDULED,
    label: 'Appointment scheduled',
    description:
      'An appointment was booked for the guest — ticked on Guest Check-In, or booked from a saved blue card.',
    appearsIn: BPM_GUEST_ROWS,
  },
];

/** The catalogue entry for a key, or undefined for a key nothing is known to emit. */
export function rowColorCondition(key: string): RowColorCondition | undefined {
  return BPM_GUEST_CONDITIONS.find((condition) => condition.key === key);
}

/**
 * Reserved rules for the BPM guest lists (Guest Invites and Guest Check-In).
 *
 * Priority ordering follows the brief's rule that *"Confirmed and reschedule
 * colors take priority of these colors"* — i.e. RESCHEDULED and CONFIRMED
 * outrank the three outcome colours. Among the outcome colours the brief gives
 * no order, so they are ranked by how decisively the person has moved away from
 * attending: not interested (terminal) → wants to reschedule → merely contacted.
 *
 * APPOINTMENT_SCHEDULED is a *border*, not a fill, so it never competes with the
 * others — a confirmed guest who booked an appointment shows the yellow fill and
 * the green outline together, which is what the brief describes.
 */
export const BPM_GUEST_ROW_COLORS: RowColorRule[] = [
  {
    key: BPM_GUEST_STATE.RESCHEDULED,
    label: 'Rescheduled to another event',
    description:
      'Guest was expected here but was moved to another BPM or to a 1-on-1 appointment.',
    hex: '#93c5fd',
    style: 'fill',
    priority: 10,
    enabled: true,
    reserved: true,
  },
  {
    key: BPM_GUEST_STATE.CONFIRMED,
    label: 'Confirmed',
    description: 'Someone confirmed this guest is coming.',
    hex: '#fde047',
    style: 'fill',
    priority: 20,
    enabled: true,
    reserved: true,
  },
  {
    key: BPM_GUEST_STATE.NOT_INTERESTED,
    label: 'Not interested',
    description: 'Outcome recorded as not interested.',
    hex: '#f9a8d4',
    style: 'fill',
    priority: 30,
    enabled: true,
    reserved: true,
  },
  {
    key: BPM_GUEST_STATE.RESCHEDULE_REQUESTED,
    label: 'Wants to reschedule',
    description:
      'Outcome says reschedule, but no actual reschedule was made from here.',
    hex: '#fdba74',
    style: 'fill',
    priority: 40,
    enabled: true,
    reserved: true,
  },
  {
    key: BPM_GUEST_STATE.CONTACTED,
    label: 'Called / left message',
    description: 'Contact was made but nothing has moved forward yet.',
    hex: '#cbd5e1',
    style: 'fill',
    priority: 50,
    enabled: true,
    reserved: true,
  },
  {
    key: BPM_GUEST_STATE.APPOINTMENT_SCHEDULED,
    label: 'Appointment scheduled',
    description: 'A blue card was saved with an appointment booked from it.',
    hex: '#22c55e',
    style: 'border',
    priority: 10,
    enabled: true,
    reserved: true,
  },
];

/**
 * Every reserved hex across all rule sets — what custom colours must avoid.
 *
 * Only needed by a consumer that does *not* have the server's rule set to
 * compare against: with the built-ins seeded as rows, passing the full set to
 * `isHexAvailable` already rejects a reserved colour.
 */
export const RESERVED_ROW_COLOR_HEXES: string[] = BPM_GUEST_ROW_COLORS.map(
  (rule) => rule.hex,
);
