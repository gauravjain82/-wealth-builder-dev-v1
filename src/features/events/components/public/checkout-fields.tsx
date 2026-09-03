/**
 * Input sections for the guest-checkout form.
 *
 * Each export is a controlled, presentational component — the checkout page owns
 * all state and submission. Kept in one module because they are only ever used
 * together by that one page, and each is small.
 */

import { formatPrice } from '../../utils/public-pricing';
import type {
  CheckoutAddOnSpec,
  PromoPreview,
  PublicEvent,
} from '../../types/public';
import type { EventCustomField } from '../../types/config';
import { PUBLIC_FIELD_CLASS } from '../../utils/public-brand';
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

/**
 * Attribution selector ("who referred you").
 *
 * Renders nothing when the event doesn't track attribution — the backend
 * already returns an empty `sellers` list for `DONT_TRACK`, so there is no
 * second condition to keep in sync here.
 */
export function SellerSelect({
  event,
  value,
  onChange,
  disabled,
}: {
  event: PublicEvent;
  value: number | null;
  onChange: (next: number | null) => void;
  disabled?: boolean;
}) {
  if (event.sellers.length === 0) return null;

  return (
    <PublicField
      label="Who invited you?"
      hint="Helps us credit your ticket to the right team."
    >
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        disabled={disabled}
        className={PUBLIC_FIELD_CLASS}
      >
        <option value="">Select a name (optional)</option>
        {event.sellers.map((seller) => (
          <option key={seller.id} value={seller.id}>
            {seller.display_name}
            {seller.agent_code ? ` (${seller.agent_code})` : ''}
          </option>
        ))}
      </select>
    </PublicField>
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
                <p className="text-xs text-slate-600 dark:text-white/60">
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
              className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-black/30 dark:text-white"
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
          className="mt-0.5 h-4 w-4"
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
              className="shrink-0 rounded-lg border border-slate-300 px-4 text-sm hover:bg-slate-100 dark:border-white/20 dark:hover:bg-white/10"
            >
              Remove
            </button>
          ) : (
            <button
              type="button"
              onClick={onApply}
              disabled={disabled || checking || !code.trim()}
              className="shrink-0 rounded-lg border border-slate-300 px-4 text-sm hover:bg-slate-100 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
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
