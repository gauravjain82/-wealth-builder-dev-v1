/**
 * BPM's stable-target manifest — decision G9.
 *
 * These are the only BPM controls guidance may point at. The list lives **here**, in the
 * feature that renders them, rather than in the backend, for one reason: the keys that
 * exist in code are then the keys that exist, and deleting a component that references
 * one is a `tsc` error rather than a walkthrough that silently points at nothing.
 *
 * The build emits this as JSON and the release step posts it:
 *
 *     python manage.py gms_register_targets --manifest dist/gms-targets.bpm.json
 *
 * Registration is authoritative. A key this file stops exporting is deactivated on the
 * next deploy, and any published walkthrough that needed it is disabled with its
 * managers notified — rather than left pointing at a control that is gone.
 *
 * Attributes go on elements that **already exist**. GMS does not add a wrapper element
 * to a BPM component: that is the difference between "add a stable attribute", which is
 * third in the package's own preference order, and "extend an existing component", which
 * decision G9 keeps out of this package.
 */

/** Every stable target BPM exposes to guidance. */
export const BPM_TARGETS = {
  /** The BPM (event) selector on the two-step picker. */
  contextEvent: 'bpm.context.event',
  /** The date selector. A date is also a location, since BPM v2. */
  contextOccurrence: 'bpm.context.occurrence',
  /** The control that opens Add Guest from a list or overview page. */
  addGuestOpen: 'bpm.guest_invites.add_guest',
  /** The inviter picker inside the Add Guest form. */
  addGuestInviter: 'bpm.add_guest.inviter',
  /** The prospect search / new-prospect fields. */
  addGuestIdentity: 'bpm.add_guest.identity',
  /** Phone, email and interest — never required, never blocking. */
  addGuestOptionalDetails: 'bpm.add_guest.optional_details',
  /** The submit control. Its success is the walkthrough's completion condition. */
  addGuestSave: 'bpm.add_guest.save',
} as const;

/** The type of a BPM target key. */
export type BpmTargetKey = (typeof BPM_TARGETS)[keyof typeof BPM_TARGETS];

/** What each target is, for the manifest the release step posts. */
export const BPM_TARGET_MANIFEST: ReadonlyArray<{
  target_key: BpmTargetKey;
  target_type: 'page' | 'section' | 'control' | 'modal' | 'field' | 'route';
  permission_key: string;
}> = [
  {
    target_key: BPM_TARGETS.contextEvent,
    target_type: 'control',
    permission_key: 'bpm:read',
  },
  {
    target_key: BPM_TARGETS.contextOccurrence,
    target_type: 'control',
    permission_key: 'bpm:read',
  },
  {
    target_key: BPM_TARGETS.addGuestOpen,
    target_type: 'control',
    permission_key: 'bpm_guests:manage',
  },
  {
    target_key: BPM_TARGETS.addGuestInviter,
    target_type: 'field',
    permission_key: 'bpm_guests:manage',
  },
  {
    target_key: BPM_TARGETS.addGuestIdentity,
    target_type: 'field',
    permission_key: 'bpm_guests:manage',
  },
  {
    target_key: BPM_TARGETS.addGuestOptionalDetails,
    target_type: 'field',
    permission_key: 'bpm_guests:manage',
  },
  {
    target_key: BPM_TARGETS.addGuestSave,
    target_type: 'control',
    permission_key: 'bpm_guests:manage',
  },
];
