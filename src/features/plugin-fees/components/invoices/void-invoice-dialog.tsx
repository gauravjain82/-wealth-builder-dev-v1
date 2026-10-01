/**
 * Void an invoice (P6, contract §8): `:manage`, statuses `draft`, `open` and `failed`
 * only. A note is required. Voiding cancels the charge and any scheduled retries and
 * resolves the invoice's open follow-ups; it never changes the SMD ledger.
 * `409 not_voidable` (paid or processing since the screen loaded) is a warning toast; the
 * payments, statements, follow-ups and overview refetch on settle either way.
 * Used by the payments dashboard rows and the admin agent statement.
 * Screens: `docs/plugin-fees/UI.md` §2.7 and §2.9.
 */

import { useEffect, useState } from 'react';

import { ConfirmationDialog, Textarea } from '@/shared/components';
import { useToastStore } from '@/store';

import { useVoidInvoice } from '../../hooks/use-plugin-fees';
import { PluginFeesError } from '../../services/plugin-fees-service';
import { describeError, formatMoney, formatMonth } from '../../utils/plugin-fees-format';

export interface VoidTarget {
  id: number;
  agentName: string | null;
  /** `YYYY-MM` */
  month: string | null;
  amountCents: number;
}

const CONSEQUENCE =
  'Voiding cancels the charge and any scheduled retries. It does not change the SMD ledger — post an adjustment if the month’s fee must be undone.';

export function VoidInvoiceDialog({ target, onClose }: { target: VoidTarget | null; onClose: () => void }) {
  const { addToast } = useToastStore();
  const mutation = useVoidInvoice();
  const [note, setNote] = useState('');
  useEffect(() => {
    if (target) setNote('');
  }, [target]);
  if (!target) return null;

  const what = `${target.month ? `the ${formatMonth(target.month)} ` : 'this '}invoice${
    target.agentName ? ` for ${target.agentName}` : ''
  } (${formatMoney(target.amountCents)})`;

  const onConfirm = async () => {
    try {
      await mutation.mutateAsync({ id: target.id, note: note.trim() });
      addToast({ type: 'success', message: `Voided ${what}.` });
      onClose();
    } catch (error) {
      if (error instanceof PluginFeesError && (error.code === 'not_voidable' || error.status === 409)) {
        addToast({
          type: 'warning',
          message: describeError(error, 'This invoice can no longer be voided — it may be paid or processing.'),
        });
        onClose();
        return;
      }
      addToast({
        type: 'error',
        message:
          error instanceof PluginFeesError && error.code === 'note_required'
            ? 'A note is required to void an invoice.'
            : describeError(error, 'Failed to void the invoice.'),
      });
    }
  };

  return (
    <ConfirmationDialog
      open
      title="Void invoice"
      message={`Void ${what}? ${CONSEQUENCE}`}
      confirmText="Void invoice"
      confirmDisabled={!note.trim()}
      loading={mutation.isPending}
      onConfirm={onConfirm}
      onClose={onClose}
    >
      <label className="block space-y-1 text-sm">
        <span className="text-slate-700 dark:text-white/80">Why is it being voided? (required)</span>
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          required
          aria-required="true"
          disabled={mutation.isPending}
        />
      </label>
    </ConfirmationDialog>
  );
}
