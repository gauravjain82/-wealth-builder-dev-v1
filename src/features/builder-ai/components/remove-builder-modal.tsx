/**
 * RemoveBuilderModal — confirm + reason for removing a builder from the program.
 *
 * Removal is a direct action (Decision 9): it sets the profile to TERMINATED via
 * `POST /profiles/{id}/remove`. A reason is optional but encouraged (it is
 * recorded in the audit trail).
 */

import { useEffect, useState } from 'react';
import { Button, Modal, Textarea } from '@shared/components';
import type { RosterRow } from '../types';

export interface RemoveBuilderModalProps {
  target: RosterRow | null;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
  isSubmitting: boolean;
}

/** Render the remove-builder confirmation modal. */
export function RemoveBuilderModal({
  target,
  onClose,
  onConfirm,
  isSubmitting,
}: RemoveBuilderModalProps) {
  const [reason, setReason] = useState('');

  // Reset the reason each time a new target opens the modal.
  useEffect(() => {
    if (target) setReason('');
  }, [target]);

  return (
    <Modal open={Boolean(target)} onClose={onClose} title="Remove builder">
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-white/70">
          Remove <span className="font-semibold">{target?.name}</span> from the program? They keep
          their qualification history but drop off the active roster. You can re-invite them later.
        </p>
        <Textarea
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason (optional)"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => onConfirm(reason)} disabled={isSubmitting}>
            {isSubmitting ? 'Removing…' : 'Remove builder'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
