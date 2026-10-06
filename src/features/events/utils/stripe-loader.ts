/**
 * Lazy, memoised Stripe.js loader for the public checkout.
 *
 * Imports from `@stripe/stripe-js/pure`, which — unlike the package root —
 * does not inject the Stripe.js script as an import side effect. The script
 * loads on the first `getStripe()` call and is shared after that, so the
 * landing page only pays for Stripe once its inline purchase form is near the
 * viewport, and calling it per render never reloads the script.
 */

import type { Stripe } from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js/pure';

import { config } from '@core/config';

let stripePromise: Promise<Stripe | null> | null = null;

/** The shared Stripe instance, or `null` when no publishable key is configured. */
export function getStripe(): Promise<Stripe | null> | null {
  if (!config.stripe.publishableKey) return null;
  stripePromise ??= loadStripe(config.stripe.publishableKey);
  return stripePromise;
}
