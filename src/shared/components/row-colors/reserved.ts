import type { RowColorRule } from './types';

/**
 * Reserved default row colours.
 *
 * These are the schemes the BPM brief specifies by name. They ship in the client
 * so lists are coloured correctly before any backend configuration exists, and
 * they stay `reserved: true` afterwards: from Phase 7 the business can add its
 * own rules, but it may not reuse a reserved colour (see `isHexAvailable`).
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

/** Every reserved hex across all rule sets — what custom colours must avoid. */
export const RESERVED_ROW_COLOR_HEXES: string[] = BPM_GUEST_ROW_COLORS.map(
  (rule) => rule.hex,
);
