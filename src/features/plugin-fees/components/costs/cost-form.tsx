/**
 * Log a recognition and mailing cost against an SMD. Dollar inputs are parsed as text
 * into integer cents (never through floating point); the total is computed for display
 * only — the backend stores its own `total_cents`. A `validation_error` maps `fields`
 * onto the inputs (`smd_id` must be an SMD; the backend is the authority on that).
 */

import { useState, type FormEvent } from 'react';

import { Button, Input, Textarea, UserAutocompleteDropdown } from '@/shared/components';
import { useToastStore } from '@/store';

import { useCreateCost } from '../../hooks/use-plugin-fees';
import type { CostInput } from '../../types';
import {
  describeError,
  fieldErrors,
  formatMoney,
  parseDollarsToCents,
  todayValue,
} from '../../utils/plugin-fees-format';

interface Person {
  id: number;
  label: string;
}

const EMPTY = {
  recipientName: '',
  item: '',
  recognition: '',
  mailing: '',
  note: '',
};

export function CostForm() {
  const { addToast } = useToastStore();
  const create = useCreateCost();
  const [smd, setSmd] = useState<Person | null>(null);
  const [recipient, setRecipient] = useState<Person | null>(null);
  const [fields, setFields] = useState(EMPTY);
  const [dateSent, setDateSent] = useState(todayValue());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const recognitionCents = parseDollarsToCents(fields.recognition);
  const mailingCents = parseDollarsToCents(fields.mailing);
  const total =
    typeof recognitionCents === 'number' && mailingCents !== 'invalid'
      ? recognitionCents + (mailingCents ?? 0)
      : null;

  const set = (key: keyof typeof EMPTY) => (value: string) => setFields((current) => ({ ...current, [key]: value }));

  const validate = (): Record<string, string> => {
    const out: Record<string, string> = {};
    if (!smd) out.smd_id = 'Choose the SMD this cost is charged to.';
    if (!fields.recipientName.trim()) out.recipient_name = 'Enter who received it.';
    if (!fields.item.trim()) out.item = 'Enter the item.';
    if (recognitionCents === null) out.recognition_cents = 'Enter the recognition cost (0 if none).';
    else if (recognitionCents === 'invalid') out.recognition_cents = 'Enter dollars, at most two decimals, not negative.';
    if (mailingCents === 'invalid') out.mailing_cents = 'Enter dollars, at most two decimals, not negative.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateSent)) out.date_sent = 'Choose the date it was sent.';
    return out;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length || !smd || typeof recognitionCents !== 'number') return;

    const input: CostInput = {
      smd_id: smd.id,
      recipient_name: fields.recipientName.trim(),
      item: fields.item.trim(),
      recognition_cents: recognitionCents,
      date_sent: dateSent,
    };
    if (recipient) input.recipient_id = recipient.id;
    if (typeof mailingCents === 'number') input.mailing_cents = mailingCents;
    if (fields.note.trim()) input.note = fields.note.trim();

    try {
      await create.mutateAsync(input);
      addToast({ type: 'success', message: `Cost logged against ${smd.label}.` });
      setFields(EMPTY);
      setRecipient(null);
      setErrors({});
    } catch (error) {
      const byField = fieldErrors(error);
      setErrors(byField);
      const message = describeError(error, 'Failed to log the cost.');
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

  return (
    <form className="wb-pf-stack" onSubmit={onSubmit} noValidate>
      <div className="wb-pf-form-grid">
        <div className="wb-pf-field">
          <span className="wb-pf-field-label" id="wb-pf-cost-smd-label">
            SMD charged *
          </span>
          <div aria-labelledby="wb-pf-cost-smd-label">
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

        <div className="wb-pf-field">
          <span className="wb-pf-field-label" id="wb-pf-cost-recipient-label">
            Recipient user (optional)
          </span>
          <div className="wb-pf-row" aria-labelledby="wb-pf-cost-recipient-label">
            <div style={{ flex: '1 1 12rem', minWidth: 0 }}>
              <UserAutocompleteDropdown
                selectedId={recipient?.id ?? null}
                selectedLabel={recipient?.label}
                placeholder="Link a user…"
                buttonText={recipient ? 'CHANGE' : 'SELECT'}
                fetchFromApi
                includeUncoded
                disabled={create.isPending}
                onSelect={(option) => {
                  setRecipient({ id: option.id, label: option.label });
                  if (!fields.recipientName.trim()) set('recipientName')(option.label);
                }}
              />
            </div>
            {recipient ? (
              <Button type="button" size="sm" variant="outline" onClick={() => setRecipient(null)}>
                Clear
              </Button>
            ) : null}
          </div>
          {err('recipient_id')}
        </div>

        <label className="wb-pf-field">
          <span className="wb-pf-field-label">Recipient name *</span>
          <Input
            value={fields.recipientName}
            onChange={(event) => set('recipientName')(event.target.value)}
            aria-invalid={Boolean(errors.recipient_name)}
            disabled={create.isPending}
          />
          {err('recipient_name')}
        </label>

        <label className="wb-pf-field">
          <span className="wb-pf-field-label">Item *</span>
          <Input
            value={fields.item}
            onChange={(event) => set('item')(event.target.value)}
            placeholder="e.g. Mission ring"
            aria-invalid={Boolean(errors.item)}
            disabled={create.isPending}
          />
          {err('item')}
        </label>

        <label className="wb-pf-field">
          <span className="wb-pf-field-label">Recognition ($) *</span>
          <Input
            inputMode="decimal"
            value={fields.recognition}
            onChange={(event) => set('recognition')(event.target.value)}
            placeholder="0.00"
            aria-invalid={Boolean(errors.recognition_cents)}
            disabled={create.isPending}
          />
          {err('recognition_cents')}
        </label>

        <label className="wb-pf-field">
          <span className="wb-pf-field-label">Mailing ($)</span>
          <Input
            inputMode="decimal"
            value={fields.mailing}
            onChange={(event) => set('mailing')(event.target.value)}
            placeholder="0.00"
            aria-invalid={Boolean(errors.mailing_cents)}
            disabled={create.isPending}
          />
          {err('mailing_cents')}
        </label>

        <label className="wb-pf-field">
          <span className="wb-pf-field-label">Date sent *</span>
          <Input
            type="date"
            value={dateSent}
            onChange={(event) => setDateSent(event.target.value)}
            aria-invalid={Boolean(errors.date_sent)}
            disabled={create.isPending}
          />
          {err('date_sent')}
        </label>

        <div className="wb-pf-field">
          <span className="wb-pf-field-label">Total</span>
          <span className="wb-pf-detail-value" aria-live="polite">
            {formatMoney(total)}
          </span>
        </div>

        <label className="wb-pf-field wb-pf-span-2">
          <span className="wb-pf-field-label">Note (optional)</span>
          <Textarea
            value={fields.note}
            onChange={(event) => set('note')(event.target.value)}
            rows={2}
            disabled={create.isPending}
          />
          {err('note')}
        </label>
      </div>

      <p className="wb-pf-muted" style={{ margin: 0 }}>
        The cost is netted against the SMD on the 1st of the month after it was sent.
      </p>
      {formError ? (
        <div className="wb-pf-form-error" role="alert">
          {formError}
        </div>
      ) : null}
      <div className="wb-pf-row">
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Saving…' : 'Log cost'}
        </Button>
      </div>
    </form>
  );
}
