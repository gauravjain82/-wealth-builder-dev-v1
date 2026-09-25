import { Button, Modal } from '@shared/components';
import type { ProspectMatch } from '../types';

interface DuplicateProspectDialogProps {
  open: boolean;
  match: ProspectMatch | null;
  /** Disable both actions while the create/select is in flight. */
  busy?: boolean;
  /** Use the person we already have instead of creating a second record. */
  onUseExisting: () => void;
  /** Genuinely a different person — create the new prospect anyway. */
  onCreateNew: () => void;
  onCancel: () => void;
}

/**
 * *"Possible duplicate — is this them?"* (decision D9).
 *
 * The matching itself has been in the backend since Phase 4: an add whose email
 * or E.164 phone already belongs to somebody silently links to that person
 * rather than creating a second record. That is the right default, but on the
 * walk-in screens it is also a silent one — somebody typing a name at a door
 * has no way to tell whether they just invited the person in front of them or
 * attached the invite to a stranger with the same mobile number.
 *
 * So this asks. It is deliberately not a generic yes/no: the question only means
 * something if the person being matched is shown, and the honest answer to "is
 * this them?" is sometimes no, which has to stay available.
 */
export function DuplicateProspectDialog({
  open,
  match,
  busy,
  onUseExisting,
  onCreateNew,
  onCancel,
}: DuplicateProspectDialogProps) {
  const person = match?.match ?? null;
  const matchedOn = match?.matched_on;

  return (
    <Modal
      open={open && Boolean(person)}
      title="Possible duplicate"
      onClose={onCancel}
      contentClassName="max-w-[480px]"
    >
      <p className="text-sm text-slate-600 dark:text-white/70">
        Somebody with the same {matchedOn === 'phone' ? 'phone number' : 'email address'} is already in the
        system. Is this them?
      </p>

      {person ? (
        <div className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-white/10">
          <div className="font-medium text-slate-900 dark:text-white">
            {person.name || `Prospect #${person.id}`}
          </div>
          <div className="mt-0.5 text-xs text-slate-500 dark:text-white/60">
            {[person.phone, person.email, [person.city, person.state].filter(Boolean).join(', ')]
              .filter(Boolean)
              .join(' · ') || 'No contact details on file'}
          </div>
          {person.agency_code ? (
            <div className="mt-2 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
              This is a recruited associate ({person.agency_code}) — they belong in Associate Check-In, not
              on a guest list.
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={onCreateNew}>
          No, create new
        </Button>
        <Button type="button" disabled={busy} onClick={onUseExisting}>
          Yes, use this person
        </Button>
      </div>
    </Modal>
  );
}
