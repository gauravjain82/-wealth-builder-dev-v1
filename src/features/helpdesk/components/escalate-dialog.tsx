/** Confirm dialog for moving a ticket to another tier; a reason is required. */

import { useEffect, useState, type FormEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface EscalateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dialog heading, e.g. "Escalate to central support". */
  title: string;
  /** One line explaining what happens next. */
  description: string;
  /** Submit button label. */
  confirmLabel: string;
  /** Called with the trimmed reason; reject to keep the dialog open. */
  onConfirm: (reason: string) => Promise<unknown>;
}

/** Reason-required escalation dialog shared by the staff and team queues. */
export function EscalateDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm }: EscalateDialogProps) {
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start clean every time the dialog opens.
  useEffect(() => {
    if (open) {
      setReason('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setError(null);
    try {
      await onConfirm(trimmed);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to escalate ticket.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1150] bg-slate-900/40 dark:bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1160] w-[min(480px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-white/10 dark:bg-[#141925] dark:text-white">
          <form onSubmit={(event) => void handleSubmit(event)}>
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10">
              <div>
                <Dialog.Title className="text-base font-bold">{title}</Dialog.Title>
                <Dialog.Description className="text-xs text-slate-600 dark:text-white/65">{description}</Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button type="button" aria-label="Close" className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/10">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
            <div className="px-4 py-3">
              <label htmlFor="helpdesk-escalate-reason" className="mb-1 block text-xs font-semibold">
                Reason <span className="text-red-600 dark:text-red-300">*</span>
              </label>
              <textarea
                id="helpdesk-escalate-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                required
                disabled={pending}
                placeholder="What has been tried, and why it needs to move on"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 dark:border-white/20 dark:bg-black/30 dark:text-white dark:placeholder:text-white/50"
              />
              {error ? <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-300">{error}</p> : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-white/10">
              <Dialog.Close asChild>
                <button type="button" disabled={pending} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 dark:border-white/25 dark:hover:bg-white/10">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={pending || !reason.trim()}
                className="rounded-lg bg-[#f5d66a] px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? 'Sending...' : confirmLabel}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
