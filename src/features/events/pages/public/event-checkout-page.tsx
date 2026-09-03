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
 */

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

import { config } from '@core/config';
import { useToastStore } from '@/store';

import { useEventCheckout } from '../../hooks/use-event-checkout';
import { usePublicEvent } from '../../hooks/use-public-event';
import { publicEventService } from '../../services/public-event-service';
import { computeSummary, formatMoney } from '../../utils/public-pricing';
import type {
  CheckoutAddOnSpec,
  CheckoutPayload,
  PromoPreview,
  PublicEvent,
} from '../../types/public';
import {
  AddOnsPicker,
  CustomFieldsForm,
  PromoCodeInput,
  PurchaserFields,
  QuantitySelector,
  SellerSelect,
} from '../../components/public/checkout-fields';
import { OrderSummaryCard } from '../../components/public/order-summary';
import {
  BrandButton,
  PublicAlert,
  PublicCard,
  PublicEventShell,
  PublicSection,
} from '../../components/public/public-event-shell';
import { StripePaymentStep } from '../../components/public/stripe-payment-step';

// Created once at module scope — `loadStripe` injects a script tag, so calling
// it per render would reload Stripe.js on every keystroke.
const stripePromise = config.stripe.publishableKey
  ? loadStripe(config.stripe.publishableKey)
  : null;

export default function EventCheckoutPage() {
  const { shortcut = '' } = useParams<{ shortcut: string }>();
  const { event, loading, notFound, error } = usePublicEvent(shortcut);

  if (loading) {
    return (
      <PublicEventShell narrow>
        <p className="py-16 text-center text-sm text-slate-600 dark:text-white/70">
          Loading checkout…
        </p>
      </PublicEventShell>
    );
  }

  if (notFound || !event) {
    return (
      <PublicEventShell narrow>
        <div className="py-16 text-center">
          <h1 className="text-2xl font-bold">Event not available</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-white/70">
            {error ?? "This event either doesn't exist or isn't published yet."}
          </p>
        </div>
      </PublicEventShell>
    );
  }

  return <CheckoutForEvent event={event} shortcut={shortcut} />;
}

function CheckoutForEvent({
  event,
  shortcut,
}: {
  event: PublicEvent;
  shortcut: string;
}) {
  const addToast = useToastStore((state) => state.addToast);
  const checkout = useEventCheckout(shortcut);

  const [quantity, setQuantity] = useState(1);
  const [purchaser, setPurchaser] = useState({
    purchaser_first_name: '',
    purchaser_last_name: '',
    purchaser_email: '',
    purchaser_phone: '',
  });
  const [sellerId, setSellerId] = useState<number | null>(null);
  const [addOns, setAddOns] = useState<CheckoutAddOnSpec[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string | boolean>>({});
  const [promoCode, setPromoCode] = useState('');
  const [promo, setPromo] = useState<PromoPreview | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const summary = useMemo(
    () => computeSummary(event, quantity, addOns, promo),
    [event, quantity, addOns, promo],
  );

  const busy = checkout.stage === 'creating' || checkout.stage === 'confirming';
  const locked = busy || checkout.stage === 'paying' || checkout.stage === 'complete';

  const applyPromo = async () => {
    setCheckingPromo(true);
    try {
      setPromo(
        await publicEventService.validatePromo(shortcut, promoCode.trim(), quantity),
      );
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Could not check that code.',
      });
    } finally {
      setCheckingPromo(false);
    }
  };

  const clearPromo = () => {
    setPromo(null);
    setPromoCode('');
  };

  const handleQuantityChange = (next: number) => {
    setQuantity(next);
    // Multi-ticket pricing and the discount total both depend on quantity, so a
    // preview priced for the old quantity would be wrong. Force a re-apply.
    if (promo) setPromo(null);
  };

  const handleSubmit = async () => {
    const payload: CheckoutPayload = {
      quantity,
      ...purchaser,
      attributed_seller_id: sellerId,
      add_ons: addOns.length > 0 ? addOns : undefined,
      promo_code: promo?.valid ? promo.code : undefined,
      custom_field_values: customValues,
    };

    const secret = await checkout.submit(payload);
    if (secret) setClientSecret(secret);
  };

  if (checkout.stage === 'complete') {
    return <CheckoutComplete event={event} checkout={checkout} />;
  }

  const purchaserName = `${purchaser.purchaser_first_name} ${purchaser.purchaser_last_name}`.trim();
  const formIncomplete =
    !purchaser.purchaser_first_name.trim() ||
    !purchaser.purchaser_last_name.trim() ||
    !purchaser.purchaser_email.trim();

  return (
    <PublicEventShell
      eventName={event.name}
      logoUrl={event.logo_url}
      brand={event.brand_color}
      shortcut={event.shortcut}
    >
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

      {checkout.error ? (
        <div className="mb-4">
          <PublicAlert message={checkout.error} />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {clientSecret && checkout.stage === 'paying' ? (
            stripePromise ? (
              // No `clientSecret` in the Elements options: that is the Payment
              // Element's contract. With CardElement the secret goes straight to
              // `confirmCardPayment`, matching the settings-page integration.
              <Elements stripe={stripePromise}>
                <StripePaymentStep
                  clientSecret={clientSecret}
                  amountCents={summary.totalCents}
                  currency={summary.currency}
                  purchaserName={purchaserName}
                  purchaserEmail={purchaser.purchaser_email}
                  onSucceeded={() => void checkout.confirmed()}
                  onFailed={checkout.fail}
                  onBack={() => {
                    // The order stays PENDING server-side; going back lets the
                    // buyer retry the card without creating a duplicate order.
                    setClientSecret(null);
                    checkout.reset();
                  }}
                />
              </Elements>
            ) : (
              <PublicAlert message="Online payment is not configured for this site. Please contact the organizer." />
            )
          ) : (
            <>
              <PublicCard className="space-y-5">
                <h2 className="text-lg font-semibold">Your Details</h2>
                <QuantitySelector
                  quantity={quantity}
                  max={event.sales_state.max_per_order}
                  onChange={handleQuantityChange}
                  disabled={locked}
                />
                <PurchaserFields
                  values={purchaser}
                  onChange={(field, value) =>
                    setPurchaser((prev) => ({ ...prev, [field]: value }))
                  }
                  disabled={locked}
                />
                <SellerSelect
                  event={event}
                  value={sellerId}
                  onChange={setSellerId}
                  disabled={locked}
                />
              </PublicCard>

              {event.custom_fields.length > 0 ? (
                <PublicCard>
                  <h2 className="mb-4 text-lg font-semibold">
                    Registration Questions
                  </h2>
                  <CustomFieldsForm
                    fields={event.custom_fields}
                    values={customValues}
                    onChange={(fieldId, value) =>
                      setCustomValues((prev) => ({ ...prev, [fieldId]: value }))
                    }
                    disabled={locked}
                  />
                </PublicCard>
              ) : null}

              {event.add_ons.length > 0 ? (
                <PublicSection title="Add-Ons">
                  <AddOnsPicker
                    event={event}
                    selections={addOns}
                    onChange={setAddOns}
                    disabled={locked}
                  />
                </PublicSection>
              ) : null}

              <PublicCard>
                <PromoCodeInput
                  code={promoCode}
                  onCodeChange={setPromoCode}
                  onApply={() => void applyPromo()}
                  onClear={clearPromo}
                  preview={promo}
                  checking={checkingPromo}
                  currency={event.payment_currency}
                  disabled={locked}
                />
              </PublicCard>

              <BrandButton
                onClick={() => void handleSubmit()}
                disabled={locked || formIncomplete || !event.sales_state.is_open}
                className="w-full py-3 text-base"
              >
                {checkout.stage === 'creating'
                  ? 'Starting payment…'
                  : `Continue to Payment — ${formatMoney(summary.totalCents, summary.currency)}`}
              </BrandButton>
            </>
          )}
        </div>

        <OrderSummaryCard
          event={event}
          quantity={quantity}
          addOns={addOns}
          summary={summary}
          tierLabel={event.current_tier?.label ?? 'Ticket'}
        />
      </div>
    </PublicEventShell>
  );
}

/** Success screen: shows the issued tickets, or a fallback if the webhook lagged. */
function CheckoutComplete({
  event,
  checkout,
}: {
  event: PublicEvent;
  checkout: ReturnType<typeof useEventCheckout>;
}) {
  const { settled, order } = checkout;

  return (
    <PublicEventShell
      eventName={event.name}
      logoUrl={event.logo_url}
      brand={event.brand_color}
      shortcut={event.shortcut}
      narrow
    >
      <PublicCard className="text-center">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--event-brand)' }}>
          You're going to {event.name}!
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-white/70">
          Invoice {settled?.invoice_number ?? order?.invoice_number}. A confirmation
          email is on its way.
        </p>

        {settled && settled.tickets.length > 0 ? (
          <div className="mt-6 space-y-2 text-left">
            <h2 className="text-sm font-semibold uppercase tracking-wide">
              Your Tickets
            </h2>
            {settled.tickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/event/ticket/${ticket.qr_token}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
              >
                <span className="font-medium">{ticket.ticket_number}</span>
                <span
                  className="text-xs underline underline-offset-2"
                  style={{ color: 'var(--event-brand)' }}
                >
                  View ticket
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-slate-600 dark:text-white/70">
            Your payment went through and your tickets are being issued. They'll
            arrive by email shortly — you can also find them any time on the
            manage-tickets page using your email and invoice number.
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to={`/event/${event.shortcut}/transfer`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 dark:border-white/20 dark:hover:bg-white/10"
          >
            Assign Attendee Names
          </Link>
          <Link
            to={`/event/${event.shortcut}`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 dark:border-white/20 dark:hover:bg-white/10"
          >
            Back to Event
          </Link>
        </div>
      </PublicCard>
    </PublicEventShell>
  );
}
