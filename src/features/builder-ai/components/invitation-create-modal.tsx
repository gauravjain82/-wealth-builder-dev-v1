/**
 * InvitationCreateModal — pick a member and send a BuilderInvitation.
 *
 * The picker searches users (`/api/accounts/users/`); the backend re-checks the
 * BuilderInvitationRule (direct team / depth / cap) on create and returns a clear
 * error if the invitee is ineligible, which we surface as a toast. Creating the
 * invitation also creates the INVITED profile server-side (Decision 9).
 */

import { useState } from 'react';
import { Button, Modal, UserAutocompleteDropdown } from '@shared/components';
import type { UserAutocompleteOption } from '@shared/components';

export interface InvitationCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (inviteeId: number) => Promise<void>;
  isSubmitting: boolean;
}

/** Render the create-invitation modal. */
export function InvitationCreateModal({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: InvitationCreateModalProps) {
  const [selected, setSelected] = useState<UserAutocompleteOption | null>(null);

  const close = () => {
    setSelected(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title="Invite a builder">
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-white/70">
          Select a member of your direct team to invite into the program. They receive an in-app
          notification (plus email/SMS if on file) and appear as <em>Invited</em> until they accept.
        </p>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/60">
            Member
          </label>
          <UserAutocompleteDropdown
            fetchFromApi
            selectedId={selected?.id ?? null}
            selectedLabel={selected?.label}
            placeholder="Search name or agent code"
            onSelect={setSelected}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={close} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={() => selected && onSubmit(selected.id)}
            disabled={!selected || isSubmitting}
          >
            {isSubmitting ? 'Sending…' : 'Send invitation'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
