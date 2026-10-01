/**
 * Review decisions. Approve / Verify confirms with an optional note; Reject requires a
 * note (it is emailed to the agent) and cannot be submitted empty — the backend answers
 * `400 note_required` too.
 */

import { useEffect, useState } from 'react';

import { Button, ConfirmationDialog, Modal, Textarea } from '@/shared/components';

export function ApproveDialog({
  open,
  title,
  message,
  confirmText,
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  loading: boolean;
  onConfirm: (note: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  useEffect(() => {
    if (open) setNote('');
  }, [open]);

  return (
    <ConfirmationDialog
      open={open}
      title={title}
      message={message}
      confirmText={confirmText}
      confirmVariant="default"
      loading={loading}
      onConfirm={() => onConfirm(note.trim())}
      onClose={onClose}
    >
      <label className="block space-y-1 text-sm">
        <span className="text-slate-700 dark:text-white/80">Note (optional)</span>
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          disabled={loading}
        />
      </label>
    </ConfirmationDialog>
  );
}

export function RejectModal({
  open,
  title,
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  loading: boolean;
  onConfirm: (note: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (open) {
      setNote('');
      setTouched(false);
    }
  }, [open]);

  if (!open) return null;
  const empty = !note.trim();

  return (
    <Modal open={open} title={title} onClose={onClose} contentClassName="max-w-[520px]">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);
          if (!empty) void onConfirm(note.trim());
        }}
      >
        <p className="text-sm text-slate-700 dark:text-white/90">
          The note is required and is emailed to the agent. Say what needs to change.
        </p>
        <label className="block space-y-1 text-sm">
          <span className="text-slate-700 dark:text-white/80">Reason for rejection</span>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onBlur={() => setTouched(true)}
            rows={4}
            required
            aria-invalid={touched && empty}
            disabled={loading}
          />
        </label>
        {touched && empty ? (
          <p className="text-xs text-red-600 dark:text-red-300">A note is required to reject.</p>
        ) : null}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive" disabled={loading || empty}>
            {loading ? 'Please wait...' : 'Reject'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
