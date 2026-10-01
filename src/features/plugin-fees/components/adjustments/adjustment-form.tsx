/**
 * Post a manual ledger adjustment (P6, contract §8, `:manage`). Direction (credit: owed
 * to the SMD, `+`; debit: the SMD owes, `−`) and a dollar amount become one signed
 * integer of cents, parsed as text (never through floating point). The note is required;
 * an invoice id is optional. A confirmation restates the effect, because an adjustment
 * can never be edited or deleted. `validation_error` / `note_required` map onto the
 * fields (`smd_id` must be an agent who may hold a ledger — the backend decides).
 */

import { useState, type FormEvent } from 'react';

import { Button, ConfirmationDialog, Input, Select, Textarea, UserAutocompleteDropdown } from '@/shared/components';
import { useToastStore } from '@/store';

import { useCreateAdjustment } from '../../hooks/use-plugin-fees';
import { PluginFeesError } from '../../services/plugin-fees-service';
import type { AdjustmentInput } from '../../types';
import {
  describeError,
  fieldErrors,
  formatMoney,
  formatSignedMoney,
  parseDollarsToCents,
} from '../../utils/plugin-fees-format';

export interface Person {
  id: number;
  label: string;
}

type Direction = 'credit' | 'debit';

export function AdjustmentForm({ initialSmd }: { initialSmd?: Person | null }) {
  const { addToast } = useToastStore();
  const create = useCreateAdjustment();
  const [smd, setSmd] = useState<Person | null>(initialSmd ?? null);
  const [direction, setDirection] = useState<Direction>('credit');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<AdjustmentInput | null>(null);

  const cents = parseDollarsToCents(amount);
  const signed = typeof cents === 'number' && cents > 0 ? (direction === 'credit' ? cents : -cents) : null;

  const validate = (): Record<string, string> => {
    const out: Record<string, string> = {};
    if (!smd) out.smd_id = 'Choose the SMD whose ledger is adjusted.';
    if (cents === null) out.amount_cents = 'Enter the amount.';
    else if (cents === 'invalid') out.amount_cents = 'Enter dollars, at most two decimals.';
    else if (cents === 0) out.amount_cents = 'The amount cannot be zero.';
    if (!note.trim()) out.note = 'A note is required — say why.';
    if (invoiceId.trim() && !/^\d+$/.test(invoiceId.trim())) out.invoice_id = 'An invoice id is a number.';
    return out;
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length || !smd || signed === null) return;
    const input: AdjustmentInput = { smd_id: smd.id, amount_cents: signed, note: note.trim() };
    if (invoiceId.trim()) input.invoice_id = Number(invoiceId.trim());
    setConfirming(input);
  };

  const onConfirm = async () => {
    if (!confirming || !smd) return;
    try {
      await create.mutateAsync(confirming);
      addToast({
        type: 'success',
        message: `${smd.label}'s ledger ${confirming.amount_cents > 0 ? 'credited' : 'debited'} by ${formatMoney(
          Math.abs(confirming.amount_cents)
        )}.`,
      });
      setConfirming(null);
      setAmount('');
      setNote('');
      setInvoiceId('');
      setErrors({});
    } catch (error) {
      setConfirming(null);
      const byField = fieldErrors(error);
      if (error instanceof PluginFeesError && error.code === 'note_required') byField.note = 'A note is required.';
      setErrors(byField);
      const message = describeError(error, 'Failed to post the adjustment.');
      setFormError(message);
      addToast({ type: 'error', message });
    }
  };

  const err = (key: string) =>
    errors[key] ? (
      <span className="wb-pf-field-error" role="alert">
        {errors[key]}
      </span>
    ) : null;

  const confirmMessage = confirming
    ? `This will ${confirming.amount_cents > 0 ? 'credit' : 'debit'} ${smd?.label ?? 'this SMD'}'s ledger by ${formatMoney(
        Math.abs(confirming.amount_cents)
      )}. Adjustments cannot be edited or deleted — correct a mistake with an opposite adjustment.`
    : '';

  return (
    <form className="wb-pf-stack" onSubmit={onSubmit} noValidate>
      <div className="wb-pf-form-grid">
        <div className="wb-pf-field wb-pf-span-2">
          <span className="wb-pf-field-label" id="wb-pf-adj-smd-label">
            SMD *
          </span>
          <div aria-labelledby="wb-pf-adj-smd-label">
            <UserAutocompleteDropdown
              selectedId={smd?.id ?? null}
              selectedLabel={smd?.label}
              placeholder="Search for the SMD…"
              buttonText={smd ? 'CHANGE' : 'SELECT'}
              fetchFromApi
              disabled={create.isPending}
              onSelect={(option) => setSmd({ id: option.id, label: option.label })}
            />
          </div>
          {err('smd_id')}
        </div>

        <label className="wb-pf-field">
          <span className="wb-pf-field-label">Direction *</span>
          <Select
            value={direction}
            onChange={(event) => setDirection(event.target.value as Direction)}
            disabled={create.isPending}
          >
            <option value="credit">Credit — owed to the SMD (+)</option>
            <option value="debit">Debit — the SMD owes (−)</option>
          </Select>
        </label>

        <label className="wb-pf-field">
          <span className="wb-pf-field-label">Amount ($) *</span>
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            aria-invalid={Boolean(errors.amount_cents)}
            disabled={create.isPending}
          />
          {err('amount_cents')}
          <span className="wb-pf-muted" aria-live="polite">
            Posts {signed === null ? '—' : formatSignedMoney(signed)}
          </span>
        </label>

        <label className="wb-pf-field">
          <span className="wb-pf-field-label">Invoice id (optional)</span>
          <Input
            inputMode="numeric"
            value={invoiceId}
            onChange={(event) => setInvoiceId(event.target.value)}
            placeholder="e.g. 9"
            aria-invalid={Boolean(errors.invoice_id)}
            disabled={create.isPending}
          />
          {err('invoice_id')}
        </label>

        <label className="wb-pf-field wb-pf-span-2">
          <span className="wb-pf-field-label">Note * — recorded with the entry and audited</span>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            placeholder="e.g. Recollect reversed Nov charge"
            aria-invalid={Boolean(errors.note)}
            disabled={create.isPending}
          />
          {err('note')}
        </label>
      </div>

      {formError ? (
        <div className="wb-pf-form-error" role="alert">
          {formError}
        </div>
      ) : null}
      <div className="wb-pf-row">
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Posting…' : 'Post adjustment…'}
        </Button>
      </div>

      <ConfirmationDialog
        open={confirming !== null}
        title={confirming && confirming.amount_cents > 0 ? 'Credit the ledger' : 'Debit the ledger'}
        message={confirmMessage}
        confirmText="Post adjustment"
        confirmVariant="default"
        loading={create.isPending}
        onConfirm={onConfirm}
        onClose={() => setConfirming(null)}
      >
        {confirming ? (
          <dl className="wb-pf-summary-list">
            <div>
              <dt>Amount</dt>
              <dd>{formatSignedMoney(confirming.amount_cents)}</dd>
            </div>
            <div>
              <dt>Note</dt>
              <dd>{confirming.note}</dd>
            </div>
            {confirming.invoice_id ? (
              <div>
                <dt>Invoice</dt>
                <dd>#{confirming.invoice_id}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </ConfirmationDialog>
    </form>
  );
}
