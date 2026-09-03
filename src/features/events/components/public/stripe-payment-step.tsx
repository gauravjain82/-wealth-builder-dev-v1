/**
 * The card-entry step of guest checkout.
 *
 * Flow: the order already exists server-side (status PENDING) with a
 * PaymentIntent, and this component confirms that intent with the buyer's card.
 * It never sees card data — `CardElement` is a Stripe-hosted iframe, so raw PAN
 * never touches our origin.
 *
 * Uses `CardElement` + `confirmCardPayment` to match the existing Stripe
 * integration in the settings page (same `@stripe/react-stripe-js` version and
 * idioms) rather than introducing a second, PaymentElement-based pattern.
 */

import { useState } from 'react';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';

import { formatMoney } from '../../utils/public-pricing';
import { BrandButton, PublicAlert, PublicCard } from './public-event-shell';

/** Matches the CardElement styling used elsewhere in the app. */
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '15px',
      color: '#0f172a',
      '::placeholder': { color: '#94a3b8' },
    },
    invalid: { color: '#dc2626' },
  },
} as const;

interface StripePaymentStepProps {
  /** PaymentIntent client secret returned by the checkout endpoint. */
  clientSecret: string;
  /** Amount being charged, in integer cents (display only). */
  amountCents: number;
  currency: string;
  purchaserName: string;
  purchaserEmail: string;
  /** Called after Stripe reports the payment succeeded. */
  onSucceeded: () => void;
  /** Called when Stripe declines or errors. */
  onFailed: (message: string) => void;
  onBack: () => void;
}

export function StripePaymentStep({
  clientSecret,
  amountCents,
  currency,
  purchaserName,
  purchaserEmail,
  onSucceeded,
  onFailed,
  onBack,
}: StripePaymentStepProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) {
      setCardError('The payment form failed to load. Please reload the page.');
      return;
    }

    setSubmitting(true);
    setCardError(null);

    try {
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card,
          billing_details: { name: purchaserName, email: purchaserEmail },
        },
      });

      if (result.error) {
        const message = result.error.message ?? 'Your payment could not be processed.';
        setCardError(message);
        onFailed(message);
        return;
      }

      // `succeeded` is the only state that means we're done. `processing` and
      // `requires_action` are handled by Stripe before this resolves, so
      // anything else here is unexpected and must not be reported as paid.
      if (result.paymentIntent?.status === 'succeeded') {
        onSucceeded();
        return;
      }

      const message = `Payment is ${result.paymentIntent?.status ?? 'incomplete'}. Please try again.`;
      setCardError(message);
      onFailed(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicCard>
      <h2 className="text-lg font-semibold">Payment</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-white/70">
        Paying {formatMoney(amountCents, currency)} — your card is charged by Stripe.
      </p>

      <div className="mt-4 rounded-lg border border-slate-300 bg-white p-3 dark:border-white/20">
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>

      {cardError ? (
        <div className="mt-3">
          <PublicAlert message={cardError} />
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <BrandButton onClick={handlePay} disabled={!stripe || submitting}>
          {submitting ? 'Processing…' : `Pay ${formatMoney(amountCents, currency)}`}
        </BrandButton>
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="text-sm underline underline-offset-2 disabled:opacity-50"
        >
          Back to details
        </button>
      </div>

      <p className="mt-4 text-xs text-slate-500 dark:text-white/50">
        Card details are entered directly into Stripe and never reach our servers.
      </p>
    </PublicCard>
  );
}
