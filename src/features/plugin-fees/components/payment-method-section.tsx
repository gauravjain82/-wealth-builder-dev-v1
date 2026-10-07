/**
 * Settings → How you pay plug-in fees (MD and SMD).
 *
 * Every agent is charged automatically: the saved bank account or card is charged on
 * the 1st. The choice is only shown once an admin has enabled pay-by-invoice
 * (`self_pay_allowed`), which they do after an automatic charge failed all its retries:
 * - `automatic`: as above.
 * - `self_pay`: no automatic charge; each month the agent gets a payment link and
 *   chooses bank, card or Klarna there. Klarna is only ever the agent's choice (D19).
 *
 * Saving a method goes through a Stripe setup session: POST, then redirect the browser
 * to the returned URL, the same shape as `handleOpenBillingPortal` in
 * `src/features/settings/pages/settings-page.tsx`. The return (`?fee_pm=`) is handled by
 * `PluginFeesSettingsSections`. A bank account on micro-deposits shows
 * `pending_verification` until Stripe confirms it.
 */

import { useState } from 'react';

import { usePageRestored } from '@/hooks/use-page-restored';
import { useToastStore } from '@/store';

import { useCreatePaymentMethodSetupSession, useSetPaymentPreference } from '../hooks/use-plugin-fees';
import type { PaymentPreference, PluginFeesPaymentMethod } from '../types';
import { describeError, formatDateTime } from '../utils/plugin-fees-format';
import { Detail } from './submission-parts';

const TYPE_LABEL: Record<string, string> = {
  us_bank_account: 'Bank account (ACH)',
  card: 'Card',
};

function ordinal(day: number): string {
  const tens = day % 100;
  if (tens >= 11 && tens <= 13) return `${day}th`;
  return `${day}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] ?? 'th'}`;
}

function MethodStatus({
  paymentMethod,
  waitingForStripe,
}: {
  paymentMethod: PluginFeesPaymentMethod;
  waitingForStripe: boolean;
}) {
  const typeLabel = paymentMethod.type ? TYPE_LABEL[paymentMethod.type] ?? paymentMethod.type : '—';
  switch (paymentMethod.status) {
    case 'saved':
      return (
        <div className="wb-pf-details">
          <Detail label="Saved method">{paymentMethod.label || '—'}</Detail>
          <Detail label="Type">{typeLabel}</Detail>
          <Detail label="Saved">{formatDateTime(paymentMethod.saved_at)}</Detail>
        </div>
      );
    case 'pending_verification':
      return (
        <div className="wb-pf-callout wb-pf-callout--warning">
          <strong>Waiting for bank verification.</strong> {paymentMethod.label || 'Your bank account'} was
          saved, but Stripe needs you to confirm two small deposits it will send to the account
          (usually within 1–2 business days). Follow the instructions in Stripe&apos;s email. It
          can&apos;t be charged until then.
        </div>
      );
    case 'failed':
      return (
        <div className="wb-pf-form-error">
          <strong>Verification failed.</strong> Stripe could not verify{' '}
          {paymentMethod.label || 'your bank account'}. Please save a bank account or card again.
        </div>
      );
    default:
      return (
        <p className="wb-pf-muted" style={{ margin: 0 }}>
          {waitingForStripe ? 'Waiting for Stripe to confirm your payment method…' : 'No payment method saved.'}
        </p>
      );
  }
}

export function PaymentMethodSection({
  paymentMethod,
  waitingForStripe,
}: {
  paymentMethod: PluginFeesPaymentMethod;
  waitingForStripe: boolean;
}) {
  const { addToast } = useToastStore();
  const setupSession = useCreatePaymentMethodSetupSession();
  const setPreference = useSetPaymentPreference();
  const [redirecting, setRedirecting] = useState(false);
  usePageRestored(() => setRedirecting(false));
  const saved = paymentMethod.status === 'saved';
  const automatic = paymentMethod.preference === 'automatic';
  const canChoose = paymentMethod.self_pay_allowed;
  const dueDay = ordinal(paymentMethod.self_pay_due_day);

  const handleSave = async () => {
    try {
      setRedirecting(true);
      const { url } = await setupSession.mutateAsync('/settings');
      if (!url) throw new Error('Payment setup is unavailable right now.');
      window.location.href = url;
    } catch (error) {
      addToast({ type: 'error', message: describeError(error, 'Failed to start payment setup.') });
      setRedirecting(false);
    }
  };

  const handlePreference = async (preference: PaymentPreference) => {
    if (preference === paymentMethod.preference) return;
    try {
      await setPreference.mutateAsync(preference);
      addToast({
        type: 'success',
        message:
          preference === 'automatic'
            ? 'Your plug-in fees will be charged automatically on the 1st.'
            : `You'll get a payment link each month, due by the ${dueDay}.`,
      });
    } catch (error) {
      addToast({ type: 'error', message: describeError(error, 'Could not change how you pay.') });
    }
  };

  return (
    <div className="glass-section" id="settings-plugin-fees-payment">
      <div className="section-header">
        <h3 className="section-title">
          <span className="title-icon">🏦</span>
          How You Pay Plug-in Fees
        </h3>
      </div>

      <div className="wb-pf-stack">
        {canChoose ? (
          <fieldset className="wb-pf-choice" disabled={setPreference.isPending}>
            <legend className="wb-pf-subheading">Payment choice</legend>
            <label className="wb-pf-choice-option">
              <input
                type="radio"
                name="wb-pf-preference"
                checked={automatic}
                onChange={() => handlePreference('automatic')}
              />
              <span>
                <strong>Charge me automatically on the 1st</strong>
                <span className="wb-pf-muted"> — from the bank account or card saved below.</span>
              </span>
            </label>
            <label className="wb-pf-choice-option">
              <input
                type="radio"
                name="wb-pf-preference"
                checked={!automatic}
                onChange={() => handlePreference('self_pay')}
              />
              <span>
                <strong>I&apos;ll pay each month myself</strong>
                <span className="wb-pf-muted">
                  {' '}
                  — you&apos;ll get a payment link on the 1st, due by the {dueDay}. Pay by bank, card,
                  or Klarna (pay over time, subject to Klarna&apos;s approval and fees).
                </span>
              </span>
            </label>
          </fieldset>
        ) : (
          <p className="wb-pf-muted" style={{ margin: 0 }}>
            <strong>Charged automatically on the 1st</strong> from the bank account or card saved
            below.
          </p>
        )}

        {automatic && !saved ? (
          <div className="wb-pf-callout wb-pf-callout--warning">
            Automatic payment needs a verified bank account or card. Without one, your monthly fee
            counts as a failed payment.
          </div>
        ) : null}

        <MethodStatus paymentMethod={paymentMethod} waitingForStripe={waitingForStripe} />

        <p className="settings-hint" style={{ margin: 0 }}>
          A bank account (ACH) is the default and preferred method. This is separate from your
          website subscription.
          {!automatic ? ' A saved method is optional while you pay each month yourself.' : ''}
        </p>

        <div className="connected-account-actions">
          <button type="button" className="btn-primary" onClick={handleSave} disabled={redirecting}>
            {redirecting
              ? 'Opening…'
              : paymentMethod.status === 'none'
                ? 'Save bank account'
                : 'Replace with a bank account'}
          </button>
        </div>
      </div>
    </div>
  );
}
