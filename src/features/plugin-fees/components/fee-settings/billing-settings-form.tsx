/**
 * Billing settings (`GET` / `PATCH settings/`): the go-live month, the self-pay due day
 * (1–28), the assistant re-verification window (1–90 days) and the assistant
 * verification deadline. `:manage` edits; everyone else reads the same values. The PATCH
 * sends the required reason plus only the fields that changed; a cleared month or date
 * is sent as `null`. Once a cycle is approved (`go_live_locked`) the go-live month is
 * disabled, and a late `409 go_live_locked` lands on that field.
 */

import { useState, type FormEvent } from 'react';

import { Button, Input, Textarea } from '@/shared/components';
import { useToastStore } from '@/store';

import { useUpdateBillingSettings } from '../../hooks/use-plugin-fees';
import { PluginFeesError } from '../../services/plugin-fees-service';
import type { PluginFeesBillingSettings, UpdateBillingSettingsInput } from '../../types';
import {
  describeError,
  fieldErrors,
  formatDate,
  formatDateTime,
  formatMonth,
  MONTH_RE,
} from '../../utils/plugin-fees-format';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const GO_LIVE_LOCKED_NOTE =
  'A billing cycle has been approved, so the go-live month can no longer move.';

/** A whole number within `[min, max]`, or null. */
function parseWhole(value: string, min: number, max: number): number | null {
  const text = value.trim();
  if (!/^\d+$/.test(text)) return null;
  const number = Number(text);
  return number >= min && number <= max ? number : null;
}

/** The values, read-only — for `:review` and `:payout_approve`. */
export function BillingSettingsView({ settings }: { settings: PluginFeesBillingSettings }) {
  return (
    <div className="wb-pf-stack">
      <div className="wb-pf-details">
        <div>
          <span className="wb-pf-detail-label">Go-live month</span>
          <span className="wb-pf-detail-value">{settings.go_live_month ? formatMonth(settings.go_live_month) : 'Not set'}</span>
        </div>
        <div>
          <span className="wb-pf-detail-label">Self-pay due day</span>
          <span className="wb-pf-detail-value">Day {settings.self_pay_due_day} of the month</span>
        </div>
        <div>
          <span className="wb-pf-detail-label">Re-verification window</span>
          <span className="wb-pf-detail-value">{settings.reverify_window_days} days</span>
        </div>
        <div>
          <span className="wb-pf-detail-label">Assistant verification deadline</span>
          <span className="wb-pf-detail-value">{formatDate(settings.assistant_verification_deadline)}</span>
        </div>
      </div>
      {settings.go_live_locked ? <p className="wb-pf-muted" style={{ margin: 0 }}>{GO_LIVE_LOCKED_NOTE}</p> : null}
      <p className="wb-pf-muted" style={{ margin: 0 }}>
        Last changed {formatDateTime(settings.updated_at)}.
      </p>
    </div>
  );
}

/**
 * The editable form. The page remounts it (`key`) when `updated_at` changes, so a saved
 * or refetched value replaces the inputs.
 */
export function BillingSettingsForm({ settings }: { settings: PluginFeesBillingSettings }) {
  const { addToast } = useToastStore();
  const update = useUpdateBillingSettings();
  const [goLive, setGoLive] = useState(settings.go_live_month ?? '');
  const [dueDay, setDueDay] = useState(String(settings.self_pay_due_day));
  const [windowDays, setWindowDays] = useState(String(settings.reverify_window_days));
  const [deadline, setDeadline] = useState(settings.assistant_verification_deadline ?? '');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const dueDayValue = parseWhole(dueDay, 1, 28);
  const windowValue = parseWhole(windowDays, 1, 90);

  // Only the fields that differ from the saved values (blank month / date → null).
  const changes: Omit<UpdateBillingSettingsInput, 'reason'> = {};
  if (!settings.go_live_locked && (goLive.trim() || null) !== settings.go_live_month) {
    changes.go_live_month = goLive.trim() || null;
  }
  if (dueDayValue !== null && dueDayValue !== settings.self_pay_due_day) changes.self_pay_due_day = dueDayValue;
  if (windowValue !== null && windowValue !== settings.reverify_window_days) {
    changes.reverify_window_days = windowValue;
  }
  if ((deadline.trim() || null) !== settings.assistant_verification_deadline) {
    changes.assistant_verification_deadline = deadline.trim() || null;
  }
  const hasChanges = Object.keys(changes).length > 0;
  // Edited at all, valid or not — so an out-of-range value still reaches validation.
  const dirty =
    hasChanges ||
    dueDay.trim() !== String(settings.self_pay_due_day) ||
    windowDays.trim() !== String(settings.reverify_window_days);

  const validate = (): Record<string, string> => {
    const out: Record<string, string> = {};
    if (goLive.trim() && !MONTH_RE.test(goLive.trim())) out.go_live_month = 'Choose a month, or leave it blank.';
    if (dueDayValue === null) out.self_pay_due_day = 'Enter a day from 1 to 28.';
    if (windowValue === null) out.reverify_window_days = 'Enter a number of days from 1 to 90.';
    if (deadline.trim() && !DATE_RE.test(deadline.trim())) {
      out.assistant_verification_deadline = 'Choose a date, or leave it blank.';
    }
    if (!reason.trim()) out.reason = 'A reason is required — say why.';
    return out;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    if (!hasChanges) {
      addToast({ type: 'info', message: 'Nothing changed.' });
      return;
    }
    try {
      await update.mutateAsync({ reason: reason.trim(), ...changes });
      addToast({ type: 'success', message: 'Billing settings saved.' });
      // The page remounts this form with the saved values (new `updated_at`).
    } catch (error) {
      const byField = fieldErrors(error);
      if (error instanceof PluginFeesError) {
        if (error.code === 'reason_required') byField.reason = 'A reason is required.';
        if (error.code === 'go_live_locked') byField.go_live_month = describeError(error, GO_LIVE_LOCKED_NOTE);
      }
      setErrors(byField);
      const message = describeError(error, 'Failed to save the billing settings.');
      setFormError(message);
      addToast({ type: error instanceof PluginFeesError && error.status === 409 ? 'warning' : 'error', message });
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
        <label className="wb-pf-field">
          <span className="wb-pf-field-label">Go-live month</span>
          <Input
            type="month"
            value={goLive}
            onChange={(event) => setGoLive(event.target.value)}
            placeholder="YYYY-MM"
            aria-invalid={Boolean(errors.go_live_month)}
            disabled={update.isPending || settings.go_live_locked}
          />
          {err('go_live_month')}
          <span className="wb-pf-muted">
            {settings.go_live_locked
              ? GO_LIVE_LOCKED_NOTE
              : 'The first month billed. Only that month waits for approval. Leave blank if not decided.'}
          </span>
        </label>

        <label className="wb-pf-field">
          <span className="wb-pf-field-label">Self-pay due day (1–28) *</span>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={28}
            value={dueDay}
            onChange={(event) => setDueDay(event.target.value)}
            aria-invalid={Boolean(errors.self_pay_due_day)}
            disabled={update.isPending}
          />
          {err('self_pay_due_day')}
          <span className="wb-pf-muted">The day of the month a self-pay invoice is due.</span>
        </label>

        <label className="wb-pf-field">
          <span className="wb-pf-field-label">Re-verification window (days, 1–90) *</span>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={90}
            value={windowDays}
            onChange={(event) => setWindowDays(event.target.value)}
            aria-invalid={Boolean(errors.reverify_window_days)}
            disabled={update.isPending}
          />
          {err('reverify_window_days')}
          <span className="wb-pf-muted">How many days before it is due an assistant can be re-verified.</span>
        </label>

        <label className="wb-pf-field">
          <span className="wb-pf-field-label">Assistant verification deadline</span>
          <Input
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            aria-invalid={Boolean(errors.assistant_verification_deadline)}
            disabled={update.isPending}
          />
          {err('assistant_verification_deadline')}
          <span className="wb-pf-muted">An assistant verified by this date counts for the next month&apos;s routing.</span>
        </label>

        <label className="wb-pf-field wb-pf-span-2">
          <span className="wb-pf-field-label">Reason * — recorded in the change history</span>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            aria-invalid={Boolean(errors.reason)}
            disabled={update.isPending}
          />
          {err('reason')}
        </label>
      </div>

      {formError ? (
        <div className="wb-pf-form-error" role="alert">
          {formError}
        </div>
      ) : null}
      <div className="wb-pf-row">
        <Button type="submit" disabled={update.isPending || !dirty}>
          {update.isPending ? 'Saving…' : 'Save settings'}
        </Button>
        <span className="wb-pf-muted">
          {dirty ? '' : 'Nothing changed. '}Last changed {formatDateTime(settings.updated_at)}.
        </span>
      </div>
    </form>
  );
}
