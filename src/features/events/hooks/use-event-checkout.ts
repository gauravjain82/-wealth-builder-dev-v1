/**
 * Owns the guest-checkout state machine so the page component stays presentational.
 *
 * The flow has three server round-trips and one Stripe round-trip:
 *
 *   1. `submit()`   — POST checkout → order + PaymentIntent client secret.
 *   2. Stripe       — the caller confirms the card with that client secret.
 *   3. `confirmed()`— poll the order until the `payment_intent.succeeded`
 *                     webhook has flipped it to PAID and issued tickets.
 *
 * Step 3 is necessary because ticket issuance is asynchronous: Stripe returning
 * `succeeded` on the client only means the charge went through, not that our
 * webhook has run yet.
 */

import { useCallback, useRef, useState } from 'react';

import { publicEventService } from '../services/public-event-service';
import type {
  CheckoutPayload,
  CheckoutResult,
  PublicOrderStatus,
} from '../types/public';

/** Which stage of checkout the UI should render. */
export type CheckoutStage =
  | 'form'
  | 'creating'
  | 'paying'
  | 'confirming'
  | 'complete'
  | 'error';

/** How long to keep polling for webhook-issued tickets before giving up. */
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 45_000;

interface UseEventCheckoutResult {
  stage: CheckoutStage;
  error: string | null;
  /** Set once the order exists; carries the Stripe client secret. */
  order: CheckoutResult | null;
  /** Set once polling sees a settled order; carries the issued tickets. */
  settled: PublicOrderStatus | null;
  /** Create the order + PaymentIntent. Returns the client secret, or `null` on failure. */
  submit: (payload: CheckoutPayload) => Promise<string | null>;
  /** Mark the Stripe confirmation as in flight (disables the form). */
  beginPayment: () => void;
  /** Called after Stripe confirms — polls until the webhook issues tickets. */
  confirmed: () => Promise<void>;
  /** Report a Stripe-side failure and return the buyer to the form. */
  fail: (message: string) => void;
  reset: () => void;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useEventCheckout(shortcut: string): UseEventCheckoutResult {
  const [stage, setStage] = useState<CheckoutStage>('form');
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<CheckoutResult | null>(null);
  const [settled, setSettled] = useState<PublicOrderStatus | null>(null);

  // Kept in a ref as well so `confirmed()` can read it without being
  // re-created on every order change (it is passed to Stripe callbacks).
  const orderRef = useRef<CheckoutResult | null>(null);

  const submit = useCallback(
    async (payload: CheckoutPayload): Promise<string | null> => {
      setStage('creating');
      setError(null);
      try {
        const created = await publicEventService.checkout(shortcut, payload);
        setOrder(created);
        orderRef.current = created;
        if (!created.client_secret) {
          throw new Error(
            'The order was created but no payment could be started. Please contact the organizer.',
          );
        }
        setStage('paying');
        return created.client_secret;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Checkout failed.');
        setStage('form');
        return null;
      }
    },
    [shortcut],
  );

  const beginPayment = useCallback(() => {
    setStage('paying');
    setError(null);
  }, []);

  const confirmed = useCallback(async () => {
    const current = orderRef.current;
    if (!current) return;

    setStage('confirming');
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
      try {
        const status = await publicEventService.getOrderStatus(
          shortcut,
          current.order_uuid,
        );
        if (status.status !== 'PENDING') {
          setSettled(status);
          setStage('complete');
          return;
        }
      } catch {
        // Transient read failures are expected while the webhook is in flight;
        // keep polling until the deadline rather than failing the purchase.
      }
      await sleep(POLL_INTERVAL_MS);
    }

    // The payment succeeded but we never saw the webhook land. The order is
    // real, so show success with a caveat instead of implying payment failed.
    setSettled(null);
    setStage('complete');
  }, [shortcut]);

  const fail = useCallback((message: string) => {
    setError(message);
    setStage('form');
  }, []);

  const reset = useCallback(() => {
    setStage('form');
    setError(null);
    setOrder(null);
    setSettled(null);
    orderRef.current = null;
  }, []);

  return {
    stage,
    error,
    order,
    settled,
    submit,
    beginPayment,
    confirmed,
    fail,
    reset,
  };
}
