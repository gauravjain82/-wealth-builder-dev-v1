/**
 * Owns the guest-checkout state machine so the page component stays presentational.
 *
 * The flow has three server round-trips and one Stripe round-trip:
 *
 *   1. `submit()`   — POST checkout → order + PaymentIntent client secret.
 *   2. Stripe       — the caller confirms the card with that client secret.
 *   3. `confirmed()`— poll the order until the server has settled it (PAID)
 *                     and issued tickets.
 *
 * Step 3 is necessary because ticket issuance is asynchronous: Stripe returning
 * `succeeded` on the client only means the charge went through, not that the
 * server knows. The server settles on the `payment_intent.succeeded` webhook,
 * and each poll also makes it check the payment with Stripe itself, so a
 * missing webhook no longer strands a paid order (docs/events/PHASES.md E19).
 *
 * Reaching `complete` also forgets the buyer's saved form draft
 * (`utils/checkout-draft.ts`): the purchase is done, so the next visit on this
 * device starts empty.
 */

import { useCallback, useRef, useState } from 'react';

import { PublicApiError, publicEventService } from '../services/public-event-service';
import { clearCheckoutDraft } from '../utils/checkout-draft';
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

/** Order states that mean the money is in and the tickets exist. */
const SETTLED: ReadonlyArray<PublicOrderStatus['status']> = ['PAID', 'COMP'];

/** How long to keep polling for the issued tickets before giving up. */
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 45_000;

interface UseEventCheckoutResult {
  stage: CheckoutStage;
  error: string | null;
  /**
   * Field errors from the last failed `submit()` (DRF 400 body), keyed by
   * payload field. The form renders the ones it owns inline — currently
   * `refund_policy_accepted` — and the banner shows `error` for the rest.
   */
  fieldErrors: Record<string, string>;
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
  /**
   * A Stripe-side failure (declined card, failed 3-D Secure). The buyer stays on
   * the card step, which shows Stripe's message, and retries the same order.
   */
  fail: () => void;
  reset: () => void;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useEventCheckout(shortcut: string): UseEventCheckoutResult {
  const [stage, setStage] = useState<CheckoutStage>('form');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [order, setOrder] = useState<CheckoutResult | null>(null);
  const [settled, setSettled] = useState<PublicOrderStatus | null>(null);

  // Kept in a ref as well so `confirmed()` can read it without being
  // re-created on every order change (it is passed to Stripe callbacks).
  const orderRef = useRef<CheckoutResult | null>(null);

  const submit = useCallback(
    async (payload: CheckoutPayload): Promise<string | null> => {
      setStage('creating');
      setError(null);
      setFieldErrors({});
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
        setFieldErrors(err instanceof PublicApiError ? err.fieldErrors : {});
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
        // Only a settled order ends the wait. A declined first attempt leaves
        // it CANCELLED until the server sees this successful retry.
        if (SETTLED.includes(status.status)) {
          setSettled(status);
          clearCheckoutDraft(shortcut);
          setStage('complete');
          return;
        }
      } catch {
        // Transient read failures are expected while the webhook is in flight;
        // keep polling until the deadline rather than failing the purchase.
      }
      await sleep(POLL_INTERVAL_MS);
    }

    // Stripe took the payment but the server has not settled the order yet.
    // The order is real, so show success with a caveat instead of implying
    // the payment failed.
    setSettled(null);
    clearCheckoutDraft(shortcut);
    setStage('complete');
  }, [shortcut]);

  const fail = useCallback(() => {
    // Not back to the form: submitting it again would create a second order
    // for the same purchase. The order and its PaymentIntent are still good.
    setError(null);
    setStage('paying');
  }, []);

  const reset = useCallback(() => {
    setStage('form');
    setError(null);
    setFieldErrors({});
    setOrder(null);
    setSettled(null);
    orderRef.current = null;
  }, []);

  return {
    stage,
    error,
    fieldErrors,
    order,
    settled,
    submit,
    beginPayment,
    confirmed,
    fail,
    reset,
  };
}
