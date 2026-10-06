/**
 * Public guest checkout — `/event/:shortcut/checkout`.
 *
 * Standalone route (no auth, no `MainLayout`). Three stages, driven by
 * `useEventCheckout`:
 *
 *   1. `form`       — quantity, purchaser, seller attribution, add-ons, custom
 *                     fields, promo. Submitting creates the order + PaymentIntent.
 *   2. `paying`     — Stripe `CardElement` confirms the intent.
 *   3. `confirming` → `complete` — poll until the webhook issues tickets.
 *
 * Stage 3 exists because ticket issuance is asynchronous: Stripe telling the
 * browser "succeeded" only means the charge cleared, not that our webhook ran.
 *
 * The form itself is `CheckoutForm`, shared with the landing page's inline
 * `checkout` section; this page adds the header, the sales notice and the
 * full-page confirmation.
 */

import { Link, useParams } from 'react-router-dom';

import { useEventCheckout } from '../../hooks/use-event-checkout';
import { usePublicEvent } from '../../hooks/use-public-event';
import type { PublicEvent } from '../../types/public';
import { recallEventTheme } from '../../utils/public-brand';
import { getStripe } from '../../utils/stripe-loader';
import {
  CheckoutConfirmation,
  CheckoutForm,
} from '../../components/public/checkout-form';
import {
  PublicAlert,
  PublicEventShell,
} from '../../components/public/public-event-shell';

export default function EventCheckoutPage() {
  const { shortcut = '' } = useParams<{ shortcut: string }>();
  const { event, loading, notFound, error } = usePublicEvent(shortcut);
  // Before the event loads, use the theme this tab last saw for it.
  const remembered = recallEventTheme(shortcut);

  if (loading) {
    return (
      <PublicEventShell narrow theme={remembered?.theme} brand={remembered?.brand}>
        <p className="py-16 text-center text-sm text-slate-600 dark:text-white/70">
          Loading checkout…
        </p>
      </PublicEventShell>
    );
  }

  if (notFound || !event) {
    return (
      <PublicEventShell narrow theme={remembered?.theme} brand={remembered?.brand}>
        <div className="py-16 text-center">
          <h1 className="text-2xl font-bold">Event not available</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-white/70">
            {error ?? "This event either doesn't exist or isn't published yet."}
          </p>
        </div>
      </PublicEventShell>
    );
  }

  return <CheckoutForEvent event={event} />;
}

function CheckoutForEvent({ event }: { event: PublicEvent }) {
  const checkout = useEventCheckout(event.shortcut);
  const shellProps = {
    eventName: event.name,
    logoUrl: event.logo_url,
    brand: event.brand_color,
    theme: event.theme,
    shortcut: event.shortcut,
  };

  if (checkout.stage === 'complete') {
    return (
      <PublicEventShell {...shellProps} narrow>
        <CheckoutConfirmation event={event} checkout={checkout} />
      </PublicEventShell>
    );
  }

  return (
    <PublicEventShell {...shellProps}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Checkout</h1>
        <Link
          to={`/event/${event.shortcut}`}
          className="text-sm underline underline-offset-2 hover:opacity-80"
        >
          ← Back to event
        </Link>
      </div>

      {!event.sales_state.is_open ? (
        <PublicAlert
          tone="warning"
          message={event.sales_state.message || 'Tickets are not currently on sale.'}
        />
      ) : null}

      {/* The route is a checkout, so Stripe.js loads straight away (memoised). */}
      <CheckoutForm event={event} checkout={checkout} stripe={getStripe()} layout="page" />
    </PublicEventShell>
  );
}
