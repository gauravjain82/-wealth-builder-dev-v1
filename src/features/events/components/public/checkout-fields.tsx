/**
 * Input sections for the guest-checkout form.
 *
 * Each export is a controlled, presentational component — the checkout page owns
 * all state and submission. Kept in one module because they are only ever used
 * together by that one page, and each is small.
 */

import { useMemo, useState } from 'react';

import { formatPrice } from '../../utils/public-pricing';
import type {
  CheckoutAddOnSpec,
  PromoPreview,
  PublicEvent,
  PublicSeller,
} from '../../types/public';
import type { EventCustomField } from '../../types/config';
import { cn } from '@core/utils';

import {
  PUBLIC_FIELD_CLASS,
  PUBLIC_SECONDARY_BUTTON_CLASS,
  TOKEN_FIELD_CLASS,
} from '../../utils/public-brand';
import { SellerCombobox } from '../seller-combobox';
import { PublicCard, PublicField } from './public-event-shell';

/** Quantity stepper, capped by the server-computed `max_per_order`. */
export function QuantitySelector({
  quantity,
  max,
  onChange,
  disabled,
}: {
  quantity: number;
  max: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  // A dropdown beats a free-text number input here: it makes the per-order
  // limit visible instead of surfacing it as a validation error after submit.
  const options = Array.from({ length: Math.max(1, max) }, (_, i) => i + 1);

  return (
    <PublicField label="Number of tickets" required>
      <select
        value={quantity}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className={PUBLIC_FIELD_CLASS}
      >
        {options.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </PublicField>
  );
}

/** Purchaser identity fields — the email here is also the ticket-claim credential. */
export function PurchaserFields({
  values,
  onChange,
  disabled,
}: {
  values: {
    purchaser_first_name: string;
    purchaser_last_name: string;
    purchaser_email: string;
    purchaser_phone: string;
  };
  onChange: (field: keyof typeof values, value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <PublicField label="First name" required>
        <input
          type="text"
          value={values.purchaser_first_name}
          onChange={(e) => onChange('purchaser_first_name', e.target.value)}
          className={PUBLIC_FIELD_CLASS}
          disabled={disabled}
          required
        />
      </PublicField>
      <PublicField label="Last name" required>
        <input
          type="text"
          value={values.purchaser_last_name}
          onChange={(e) => onChange('purchaser_last_name', e.target.value)}
          className={PUBLIC_FIELD_CLASS}
          disabled={disabled}
          required
        />
      </PublicField>
      <PublicField
        label="Email"
        required
        hint="Your confirmation and tickets are sent here, and it's how you'll manage them later."
      >
        <input
          type="email"
          value={values.purchaser_email}
          onChange={(e) => onChange('purchaser_email', e.target.value)}
          className={PUBLIC_FIELD_CLASS}
          disabled={disabled}
          required
        />
      </PublicField>
      <PublicField label="Phone">
        <input
          type="tel"
          value={values.purchaser_phone}
          onChange={(e) => onChange('purchaser_phone', e.target.value)}
          className={PUBLIC_FIELD_CLASS}
          disabled={disabled}
        />
      </PublicField>
    </div>
  );
}

/** How our own leaders' team reads when the organizer has not named it (`team_name` blank). */
const OWN_TEAM_LABEL = 'Wealth Builder';

const teamOf = (seller: PublicSeller) => seller.team_name || OWN_TEAM_LABEL;

const FIELD_LABEL_CLASS =
  'block text-sm font-medium [[data-event-surface=tokens]_&]:text-xs [[data-event-surface=tokens]_&]:font-bold [[data-event-surface=tokens]_&]:uppercase [[data-event-surface=tokens]_&]:tracking-[0.12em]';
const FIELD_HINT_CLASS =
  'block text-xs text-slate-500 dark:text-white/50 [[data-event-surface=tokens]_&]:text-[color:var(--event-muted)]';

/**
 * "Which SMD are you with?" — asked at checkout, and again when a ticket is
 * assigned or transferred, so every ticket is credited to its holder's SMD.
 *
 * When the event lists more than one team (PHASES E23) there is one picker per
 * team, each headed "<team>'s SMD" and listing only that team's SMDs, so the
 * buyer sees which team they are choosing from. Teams come from the event's
 * seller list, A–Z. Exactly one team may hold a pick: with picks under two
 * teams an error names them and `onChange(null)` is reported, which keeps the
 * form from being submitted until one is cleared. With a single team there is
 * one picker, labelled `label`, listing every SMD.
 *
 * Each list is A–Z and narrows as the buyer types a name or agency code.
 *
 * Renders nothing when the event doesn't track attribution — the backend
 * already returns an empty `sellers` list for `DONT_TRACK`, and then the answer
 * is not required either. Otherwise it is required (the backend enforces it).
 */
export function SellerSelect({
  sellers,
  value,
  onChange,
  disabled,
  label = 'Your SMD',
  hint = 'Credits this ticket to the right SMD and team.',
}: {
  sellers: PublicSeller[];
  value: number | null;
  onChange: (next: number | null) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
}) {
  const teams = useMemo(
    () =>
      [...new Set(sellers.map(teamOf))].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' }),
      ),
    [sellers],
  );
  /** The SMD picked under each team. More than one entry is the error state. */
  const [picks, setPicks] = useState<Record<string, number>>(() => {
    const picked = sellers.find((seller) => seller.id === value);
    return picked ? { [teamOf(picked)]: picked.id } : {};
  });

  if (sellers.length === 0) return null;

  if (teams.length <= 1) {
    return (
      <PublicField label={label} hint={hint} required>
        <SellerCombobox
          sellers={sellers}
          value={value}
          onChange={onChange}
          disabled={disabled}
          inputClassName={PUBLIC_FIELD_CLASS}
        />
      </PublicField>
    );
  }

  const setPick = (team: string, id: number | null) => {
    const next = { ...picks };
    if (id === null) delete next[team];
    else next[team] = id;
    setPicks(next);
    // Only an unambiguous answer is an answer.
    const ids = Object.values(next);
    onChange(ids.length === 1 ? ids[0] : null);
  };
  const pickedTeams = teams.filter((team) => team in picks);
  const conflict = pickedTeams.length > 1;

  return (
    <div role="group" aria-label={label} className="space-y-4">
      <div>
        <span className={FIELD_LABEL_CLASS}>
          {label}
          <span className="ml-0.5 text-red-500">*</span>
        </span>
        <span className={cn('mt-1', FIELD_HINT_CLASS)}>
          Find your SMD under your team. Choose from one team only.
        </span>
      </div>
      {teams.map((team) => (
        <div key={team}>
          <PublicField label={`${team}’s SMD`}>
            <SellerCombobox
              sellers={sellers.filter((seller) => teamOf(seller) === team)}
              value={picks[team] ?? null}
              onChange={(id) => setPick(team, id)}
              disabled={disabled}
              inputClassName={PUBLIC_FIELD_CLASS}
            />
          </PublicField>
          {team in picks ? (
            <button
              type="button"
              onClick={() => setPick(team, null)}
              disabled={disabled}
              className="mt-1 py-1 text-sm font-semibold underline underline-offset-2 disabled:opacity-50"
              style={{ color: 'var(--event-brand)' }}
            >
              Clear {team}’s SMD
            </button>
          ) : null}
        </div>
      ))}
      {conflict ? (
        <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          You picked an SMD under more than one team ({pickedTeams.join(', ')}). Keep only
          the one for your team and clear the other{pickedTeams.length > 2 ? 's' : ''}.
        </p>
      ) : (
        <span className={FIELD_HINT_CLASS}>{hint}</span>
      )}
    </div>
  );
}

/** Add-on quantity picker. Stock-limited add-ons cap their own dropdown. */
export function AddOnsPicker({
  event,
  selections,
  onChange,
  disabled,
}: {
  event: PublicEvent;
  selections: CheckoutAddOnSpec[];
  onChange: (next: CheckoutAddOnSpec[]) => void;
  disabled?: boolean;
}) {
  if (event.add_ons.length === 0) return null;

  const quantityFor = (addOnId: number) =>
    selections.find((line) => line.add_on_id === addOnId)?.quantity ?? 0;

  const setQuantity = (addOnId: number, quantity: number) => {
    const withoutAddOn = selections.filter((line) => line.add_on_id !== addOnId);
    // Zero means "not ordered" — drop the line rather than sending quantity 0,
    // which the backend's min_value=1 validator would reject.
    onChange(
      quantity > 0
        ? [...withoutAddOn, { add_on_id: addOnId, quantity }]
        : withoutAddOn,
    );
  };

  return (
    <div className="space-y-3">
      {event.add_ons.map((addOn) => {
        const remaining =
          addOn.stock === null ? null : Math.max(0, addOn.stock - addOn.sold);
        const soldOut = remaining === 0;
        const max = Math.min(10, remaining ?? 10);

        return (
          <PublicCard key={addOn.id} className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="font-medium">{addOn.product_name}</div>
              {addOn.description ? (
                <p className="text-xs text-slate-600 dark:text-white/60 [[data-event-surface=tokens]_&]:text-[color:var(--event-muted)]">
                  {addOn.description}
                </p>
              ) : null}
              <div className="mt-1 text-sm font-semibold">
                {formatPrice(addOn.unit_price, event.payment_currency)}
                {soldOut ? (
                  <span className="ml-2 text-xs font-normal text-red-600 dark:text-red-300">
                    Sold out
                  </span>
                ) : null}
              </div>
            </div>
            <select
              value={quantityFor(addOn.id)}
              onChange={(e) => setQuantity(addOn.id, Number(e.target.value))}
              disabled={disabled || soldOut}
              aria-label={`Quantity of ${addOn.product_name}`}
              className={cn(
                'w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-black/30 dark:text-white',
                TOKEN_FIELD_CLASS,
              )}
            >
              {Array.from({ length: max + 1 }, (_, i) => i).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </PublicCard>
        );
      })}
    </div>
  );
}

/** Renders the event's configured registration questions. */
export function CustomFieldsForm({
  fields,
  values,
  onChange,
  disabled,
}: {
  fields: EventCustomField[];
  values: Record<string, string | boolean>;
  onChange: (fieldId: string, value: string | boolean) => void;
  disabled?: boolean;
}) {
  if (fields.length === 0) return null;

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <CustomFieldInput
          key={field.id}
          field={field}
          value={values[String(field.id)] ?? (field.field_type === 'CHECKBOX' ? false : '')}
          onChange={(value) => onChange(String(field.id), value)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

function CustomFieldInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: EventCustomField;
  value: string | boolean;
  onChange: (value: string | boolean) => void;
  disabled?: boolean;
}) {
  // A checkbox is its own layout (label to the right of the control), so it
  // doesn't go through PublicField.
  if (field.field_type === 'CHECKBOX') {
    return (
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="mt-0.5 h-4 w-4 [[data-event-surface=tokens]_&]:accent-[var(--event-brand)]"
        />
        <span>
          {field.name}
          {field.required ? <span className="ml-0.5 text-red-500">*</span> : null}
          {field.description ? (
            <span className="block text-xs text-slate-500 dark:text-white/50">
              {field.description}
            </span>
          ) : null}
        </span>
      </label>
    );
  }

  return (
    <PublicField
      label={field.name}
      required={field.required}
      hint={field.description || undefined}
    >
      {field.field_type === 'SELECT' ? (
        <select
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={field.required}
          className={PUBLIC_FIELD_CLASS}
        >
          <option value="">Select…</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={INPUT_TYPES[field.field_type]}
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={field.required}
          className={PUBLIC_FIELD_CLASS}
        />
      )}
    </PublicField>
  );
}

/** Map a custom field type to its HTML input type. */
const INPUT_TYPES: Record<EventCustomField['field_type'], string> = {
  TEXT: 'text',
  EMAIL: 'email',
  PHONE: 'tel',
  NUMBER: 'number',
  SELECT: 'text',
  CHECKBOX: 'checkbox',
};

/** Promo-code entry with an apply button and the server's verdict inline. */
export function PromoCodeInput({
  code,
  onCodeChange,
  onApply,
  onClear,
  preview,
  checking,
  currency,
  disabled,
}: {
  code: string;
  onCodeChange: (value: string) => void;
  onApply: () => void;
  onClear: () => void;
  preview: PromoPreview | null;
  checking: boolean;
  currency: string;
  disabled?: boolean;
}) {
  const applied = preview?.valid === true;

  return (
    <div>
      <PublicField label="Promo code">
        <div className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
            disabled={disabled || applied}
            placeholder="Enter code"
            className={PUBLIC_FIELD_CLASS}
          />
          {applied ? (
            <button
              type="button"
              onClick={onClear}
              disabled={disabled}
              className={cn('shrink-0', PUBLIC_SECONDARY_BUTTON_CLASS)}
            >
              Remove
            </button>
          ) : (
            <button
              type="button"
              onClick={onApply}
              disabled={disabled || checking || !code.trim()}
              className={cn('shrink-0', PUBLIC_SECONDARY_BUTTON_CLASS)}
            >
              {checking ? 'Checking…' : 'Apply'}
            </button>
          )}
        </div>
      </PublicField>

      {preview ? (
        <p
          className={
            applied
              ? 'mt-1 text-xs text-green-700 dark:text-green-300'
              : 'mt-1 text-xs text-red-600 dark:text-red-300'
          }
        >
          {applied
            ? `Code applied — ${formatPrice(preview.discounted_unit_price ?? null, currency)} per ticket (${formatPrice(
                preview.total_discount ?? null,
                currency,
              )} off).`
            : preview.message || 'That code is not valid.'}
        </p>
      ) : null}
    </div>
  );
}
