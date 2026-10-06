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

import type { ReactNode } from 'react';

import { cn } from '@core/utils';

import { useEventTheme } from '../../themes/theme-context';
import type { ThemeTokens } from '../../themes/registry';
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

/**
 * The card iframe can't read our CSS variables, so token themes pass their
 * literal palette (which is why `ThemeTokens` are hex).
 */
function tokenCardOptions(tokens: ThemeTokens) {
  return {
    style: {
      base: {
        fontSize: '15px',
        color: tokens.text,
        iconColor: tokens.muted,
        '::placeholder': { color: tokens.muted },
      },
      invalid: { color: '#f87171' },
    },
  };
}

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
  /** Render without the surrounding card (when already inside one). */
  bare?: boolean;
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
  bare = false,
}: StripePaymentStepProps) {
  const { tokens } = useEventTheme();
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

  const content: ReactNode = (
    <>
      <h2 className="text-lg font-semibold">Payment</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-white/70 [[data-event-surface=tokens]_&]:text-[color:var(--event-muted)]">
        Paying {formatMoney(amountCents, currency)} — your card is charged by Stripe.
      </p>

      <div
        className={cn(
          'mt-4 rounded-lg border p-3',
          tokens
            ? 'rounded-sm border-[color:var(--event-hairline)] bg-[var(--event-surface)] py-3.5'
            : 'border-slate-300 bg-white dark:border-white/20',
        )}
      >
        <CardElement options={tokens ? tokenCardOptions(tokens) : CARD_ELEMENT_OPTIONS} />
      </div>

      {cardError ? (
        <div className="mt-3">
          <PublicAlert message={cardError} />
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <BrandButton onClick={() => void handlePay()} disabled={!stripe || submitting}>
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
    </>
  );

  // Same element type in both branches' children, so toggling `bare` never
  // happens mid-payment; the CardElement iframe is not remounted on re-render.
  return bare ? <div>{content}</div> : <PublicCard>{content}</PublicCard>;
}
