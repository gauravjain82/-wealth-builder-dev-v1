/**
 * The guest-checkout form, shared by the standalone checkout page and the
 * landing page's inline `checkout` section.
 *
 * The caller owns the `useEventCheckout` state machine (so it can swap in the
 * confirmation when `stage === 'complete'`) and the Stripe instance (so the
 * landing page can defer loading Stripe.js until the form is near view). This
 * component owns the draft: quantity, purchaser, seller, add-ons, custom
 * fields, promo, refund-policy agreement — and the Stripe card step.
 *
 * The draft is remembered on the buyer's device (`utils/checkout-draft.ts`), so
 * a refresh or a closed tab does not empty the form; it is cleared on purchase.
 *
 * A buyer signed in to the app gets their name, email, phone and SMD filled in
 * from their account (`useBuyerProfile`); a guest is offered a login link that
 * returns here.
 *
 * Every amount shown here is a preview (`computeSummary`). The server prices
 * each order and the PaymentIntent it creates is what is charged (PHASES E9).
 *
 * Layouts:
 * - `page`   — form cards beside a sticky order summary (the checkout route);
 * - `inline` — one column inside a single card: price, seats left, fields,
 *              summary, agreement, button; the card step replaces it in place.
 *              An `anchorPrice` (the section's copy) is struck through before
 *              the price.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import type { Stripe } from '@stripe/stripe-js';

import { cn } from '@core/utils';
import { useToastStore } from '@/store';

import { loadCheckoutDraft, saveCheckoutDraft } from '../../utils/checkout-draft';
import { sellersByTeam } from '../../utils/public-sellers';
import { TICKETS_ANCHOR_ID } from '../../utils/ticket-links';
import { useBuyerProfile } from '../../hooks/use-buyer-profile';
import type { useEventCheckout } from '../../hooks/use-event-checkout';
import { publicEventService } from '../../services/public-event-service';
import {
  computeSummary,
  formatMoney,
  formatPrice,
} from '../../utils/public-pricing';
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
} from './checkout-fields';
import { OrderSummaryCard } from './order-summary';
import {
  BrandButton,
  Eyebrow,
  PublicAlert,
  PublicCard,
  PublicSection,
} from './public-event-shell';
import { RichText } from './rich-text';
import { StripePaymentStep } from './stripe-payment-step';

export type CheckoutController = ReturnType<typeof useEventCheckout>;

const MUTED = 'text-slate-600 dark:text-white/70 [[data-event-surface=tokens]_&]:text-[color:var(--event-muted)]';

export function CheckoutForm({
  event,
  checkout,
  stripe,
  layout,
  anchorPrice,
}: {
  event: PublicEvent;
  checkout: CheckoutController;
  /** From `getStripe()`; `null` means payments are not configured. */
  stripe: Promise<Stripe | null> | null;
  layout: 'page' | 'inline';
  /** Inline only: the regular price, shown struck through. Copy, never charged. */
  anchorPrice?: string;
}) {
  const addToast = useToastStore((state) => state.addToast);
  const shortcut = event.shortcut;
  const inline = layout === 'inline';

  // What this buyer typed last time on this device, if anything (see
  // utils/checkout-draft.ts). Read once; the form owns the values from here.
  const [draft] = useState(() => loadCheckoutDraft(event));
  const [quantity, setQuantity] = useState(draft?.quantity ?? 1);
  const [purchaser, setPurchaser] = useState(
    draft?.purchaser ?? {
      purchaser_first_name: '',
      purchaser_last_name: '',
      purchaser_email: '',
      purchaser_phone: '',
    },
  );
  const [sellerId, setSellerId] = useState<number | null>(draft?.sellerId ?? null);
  const [addOns, setAddOns] = useState<CheckoutAddOnSpec[]>(draft?.addOns ?? []);
  const [customValues, setCustomValues] = useState<Record<string, string | boolean>>(
    draft?.customValues ?? {},
  );
  const [promoCode, setPromoCode] = useState(draft?.promoCode ?? '');
  const [promo, setPromo] = useState<PromoPreview | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // A signed-in member's own details fill whatever is still empty, once: what
  // the buyer typed (or the draft restored) wins over the account.
  const { signedIn, profile } = useBuyerProfile(shortcut);
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (!profile || prefilled) return;
    setPrefilled(true);
    setPurchaser((prev) => ({
      purchaser_first_name: prev.purchaser_first_name || profile.first_name,
      purchaser_last_name: prev.purchaser_last_name || profile.last_name,
      purchaser_email: prev.purchaser_email || profile.email,
      purchaser_phone: prev.purchaser_phone || profile.phone,
    }));
    if (event.sellers.some((seller) => seller.id === profile.seller_id)) {
      setSellerId((prev) => prev ?? profile.seller_id);
    }
  }, [profile, prefilled, event.sellers]);

  // Keep the draft current. `useEventCheckout` forgets it once the purchase
  // completes — by then the host has swapped this form for the confirmation.
  useEffect(() => {
    saveCheckoutDraft(shortcut, { quantity, purchaser, sellerId, addOns, customValues, promoCode });
  }, [shortcut, quantity, purchaser, sellerId, addOns, customValues, promoCode]);

  const sellers = useMemo(() => sellersByTeam(event), [event]);
  const summary = useMemo(
    () => computeSummary(event, quantity, addOns, promo),
    [event, quantity, addOns, promo],
  );

  const busy = checkout.stage === 'creating' || checkout.stage === 'confirming';
  const locked = busy || checkout.stage === 'paying' || checkout.stage === 'complete';
  // Same rule as the server: a whitespace-only policy is no policy.
  const needsAgreement = Boolean(event.refund_policy?.trim());

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
      // The server rejects a checkout for an event with a refund policy unless
      // this is true (400, field `refund_policy_accepted`) — PHASES E18.
      refund_policy_accepted: needsAgreement ? agreed : undefined,
    };

    const secret = await checkout.submit(payload);
    if (secret) setClientSecret(secret);
  };

  const purchaserName = `${purchaser.purchaser_first_name} ${purchaser.purchaser_last_name}`.trim();
  const formIncomplete =
    !purchaser.purchaser_first_name.trim() ||
    !purchaser.purchaser_last_name.trim() ||
    !purchaser.purchaser_email.trim() ||
    (event.sellers.length > 0 && sellerId === null) ||
    (needsAgreement && !agreed);

  // A server-side refund-agreement error belongs under the checkbox, not in the
  // banner. The banner still shows it when there is no checkbox to attach it to
  // (policy absent from our copy of the event) or other fields failed too.
  const refundError = checkout.fieldErrors.refund_policy_accepted ?? null;
  const refundErrorInline =
    needsAgreement &&
    refundError !== null &&
    Object.keys(checkout.fieldErrors).length === 1;
  const errorBanner = checkout.error && !refundErrorInline ? (
    <div className={inline ? undefined : 'mb-4'}>
      <PublicAlert message={checkout.error} />
    </div>
  ) : null;

  const paymentStep =
    clientSecret && checkout.stage === 'paying' ? (
      stripe ? (
        // No `clientSecret` in the Elements options: that is the Payment
        // Element's contract. With CardElement the secret goes straight to
        // `confirmCardPayment`, matching the settings-page integration.
        <Elements stripe={stripe}>
          <StripePaymentStep
            bare={inline}
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
    ) : null;

  // Stripe has taken the payment and the hook is polling for the tickets. Say
  // so: falling back to the greyed-out form here read as "nothing happened".
  const confirmingBody =
    checkout.stage === 'confirming' ? (
      <div role="status" aria-live="polite" className="py-6 text-center">
        <h2 className="text-lg font-semibold">Payment received</h2>
        <p className={cn('mt-2 text-sm', MUTED)}>
          Issuing your tickets — this takes a few seconds. Please keep this page open.
        </p>
      </div>
    ) : null;
  const confirmingStep =
    confirmingBody && !inline ? <PublicCard>{confirmingBody}</PublicCard> : confirmingBody;
  // What replaces the form once the order exists: the card, then the wait.
  const activeStep = paymentStep ?? confirmingStep;

  const quantityField = (
    <QuantitySelector
      quantity={quantity}
      max={event.sales_state.max_per_order}
      onChange={handleQuantityChange}
      disabled={locked}
    />
  );
  const here = `/event/${shortcut}${inline ? `#${TICKETS_ANCHOR_ID}` : '/checkout'}`;
  const memberNote = prefilled ? (
    <p className={cn('text-sm', MUTED)}>
      Filled in from your Wealth Builder account. Check the details, then choose how many tickets.
    </p>
  ) : signedIn ? null : (
    <p className={cn('text-sm', MUTED)}>
      Already a Wealth Builder member?{' '}
      <Link
        to="/login"
        state={{ from: here }}
        className="font-semibold underline underline-offset-2"
        style={{ color: 'var(--event-brand)' }}
      >
        Log in
      </Link>{' '}
      and we&rsquo;ll fill this in for you.
    </p>
  );
  const purchaserFields = (
    <>
      {memberNote}
      <PurchaserFields
        values={purchaser}
        onChange={(field, value) => setPurchaser((prev) => ({ ...prev, [field]: value }))}
        disabled={locked}
      />
      <SellerSelect
        // Remount when the account fills in the SMD, so the picker shows it.
        key={prefilled ? 'member' : 'guest'}
        sellers={sellers}
        value={sellerId}
        onChange={setSellerId}
        disabled={locked}
      />
    </>
  );
  const customFields =
    event.custom_fields.length > 0 ? (
      <CustomFieldsForm
        fields={event.custom_fields}
        values={customValues}
        onChange={(fieldId, value) =>
          setCustomValues((prev) => ({ ...prev, [fieldId]: value }))
        }
        disabled={locked}
      />
    ) : null;
  const promoField = (
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
  );
  const agreement = needsAgreement ? (
    <RefundAgreement
      policy={event.refund_policy}
      checked={agreed}
      onChange={setAgreed}
      disabled={locked}
      error={refundErrorInline ? refundError : null}
    />
  ) : null;
  const submitButton = (
    <BrandButton
      onClick={() => void handleSubmit()}
      disabled={locked || formIncomplete || !event.sales_state.is_open}
      size={inline ? 'lg' : 'md'}
      className="w-full py-3 text-base"
    >
      {checkout.stage === 'creating'
        ? 'Starting payment…'
        : `Continue to Payment — ${formatMoney(summary.totalCents, summary.currency)}`}
    </BrandButton>
  );
  const summaryCard = (
    <OrderSummaryCard
      event={event}
      quantity={quantity}
      addOns={addOns}
      summary={summary}
      tierLabel={event.current_tier?.label ?? 'Ticket'}
      variant={inline ? 'inline' : 'card'}
    />
  );

  if (inline) {
    const tier = event.current_tier;
    const remaining = event.sales_state.tickets_remaining;
    const anchor = anchorPrice?.trim();
    return (
      <PublicCard emphasis className="mx-auto max-w-xl space-y-6 text-left sm:p-8">
        <div className="text-center">
          {tier ? (
            <>
              <Eyebrow>{tier.label}</Eyebrow>
              <p className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                {anchor ? (
                  <s className={cn('mr-3 align-middle text-2xl font-semibold sm:text-3xl', MUTED)}>
                    <span className="sr-only">Regular price </span>
                    {anchor}
                  </s>
                ) : null}
                {formatPrice(tier.price, event.payment_currency)}
                <span className={cn('ml-1 text-sm font-semibold', MUTED)}>/ seat</span>
              </p>
            </>
          ) : null}
          {remaining !== null ? (
            <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--event-brand)' }}>
              {remaining} seat{remaining === 1 ? '' : 's'} left
            </p>
          ) : null}
        </div>

        {/* While paying, the card step is all there is, so the error leads it. */}
        {paymentStep ? errorBanner : null}

        {activeStep ?? (
          <>
            {quantityField}
            {purchaserFields}
            {customFields}
            {event.add_ons.length > 0 ? (
              <div>
                <p className="mb-3 text-sm font-semibold">Add-ons</p>
                <AddOnsPicker
                  event={event}
                  selections={addOns}
                  onChange={setAddOns}
                  disabled={locked}
                />
              </div>
            ) : null}
            {promoField}
            {summaryCard}
            {agreement}
            {/* Beside the button that caused it: the top of the card is off-screen by now. */}
            {errorBanner}
            {submitButton}
          </>
        )}
      </PublicCard>
    );
  }

  return (
    <>
      {errorBanner}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {activeStep ?? (
            <>
              <PublicCard className="space-y-5">
                <h2 className="text-lg font-semibold">Your Details</h2>
                {quantityField}
                {purchaserFields}
              </PublicCard>

              {customFields ? (
                <PublicCard>
                  <h2 className="mb-4 text-lg font-semibold">Registration Questions</h2>
                  {customFields}
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

              <PublicCard>{promoField}</PublicCard>

              {agreement ? <PublicCard>{agreement}</PublicCard> : null}

              {submitButton}
            </>
          )}
        </div>

        {summaryCard}
      </div>
    </>
  );
}

/**
 * "I agree to the refund policy" — required before payment when the event has
 * a policy. The policy text scrolls in a short box above the checkbox.
 */
function RefundAgreement({
  policy,
  checked,
  onChange,
  disabled,
  error,
}: {
  policy: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** Server field error for `refund_policy_accepted`, shown under the checkbox. */
  error?: string | null;
}) {
  return (
    <div>
      <div
        className={cn(
          'max-h-40 overflow-y-auto rounded-md border border-slate-200 p-3 text-xs dark:border-white/10',
          '[[data-event-surface=tokens]_&]:border-[color:var(--event-hairline)]',
          MUTED,
        )}
      >
        <RichText value={policy} />
      </div>
      <label className="mt-3 flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="mt-0.5 h-4 w-4 shrink-0 [[data-event-surface=tokens]_&]:accent-[var(--event-brand)]"
        />
        <span>
          I have read and agree to the refund policy
          <span className="ml-0.5 text-red-500">*</span>
        </span>
      </label>
      {error ? (
        <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Success: the issued tickets, or a fallback if the webhook lagged. */
export function CheckoutConfirmation({
  event,
  checkout,
}: {
  event: PublicEvent;
  checkout: CheckoutController;
}) {
  const { settled, order } = checkout;
  const secondary =
    'rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 dark:border-white/20 dark:hover:bg-white/10 [[data-event-surface=tokens]_&]:rounded-sm [[data-event-surface=tokens]_&]:border-[color:var(--event-hairline-strong)]';

  return (
    <PublicCard className="text-center">
      <h2 className="text-2xl font-bold" style={{ color: 'var(--event-brand)' }}>
        You're going to {event.name}!
      </h2>
      <p className={cn('mt-2 text-sm', MUTED)}>
        Invoice {settled?.invoice_number ?? order?.invoice_number}. A confirmation
        email is on its way.
      </p>

      {settled && settled.tickets.length > 0 ? (
        <div className="mt-6 space-y-2 text-left">
          <h3 className="text-sm font-semibold uppercase tracking-wide">Your Tickets</h3>
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
        <p className={cn('mt-6 text-sm', MUTED)}>
          Your payment went through and your tickets are being issued. They'll
          arrive by email shortly — you can also find them any time on the
          manage-tickets page using your email and invoice number.
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to={`/event/${event.shortcut}/transfer`} className={secondary}>
          Assign Attendee Names
        </Link>
        <Link to={`/event/${event.shortcut}`} className={secondary}>
          Back to Event
        </Link>
      </div>
    </PublicCard>
  );
}
