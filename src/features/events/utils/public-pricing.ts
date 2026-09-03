/**
 * Client-side order-total arithmetic for the public checkout summary.
 *
 * This is a *preview only*. The server re-prices every order in
 * `PricingService`, and the amount actually charged comes from the
 * PaymentIntent it creates — so a mismatch here can mislead a buyer but can
 * never change what they pay. The rules below mirror
 * `PricingService.effective_unit_price` / `compute_order_totals`.
 *
 * DRF sends decimals as strings; all money is handled as integer cents here to
 * avoid float drift, and formatted back to strings for display.
 */

import type {
  CheckoutAddOnSpec,
  CurrentTier,
  PromoPreview,
  PublicEvent,
} from '../types/public';
import type { EventAddOn, PricingTier } from '../types/config';

/** Parse a DRF decimal string into integer cents. Returns 0 for blank/invalid. */
export function toCents(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

/** Format integer cents for display, e.g. `12345` → `"123.45"`. */
export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Format integer cents as currency for display.
 *
 * Falls back to `"{CODE} {amount}"` if the currency code is not one
 * `Intl.NumberFormat` recognises, which keeps an unusual event currency
 * readable instead of throwing.
 */
export function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(cents / 100);
  } catch {
    return `${currency} ${fromCents(cents)}`;
  }
}

/** Convenience for formatting a DRF decimal string directly. */
export function formatPrice(value: string | null | undefined, currency: string): string {
  return formatMoney(toCents(value), currency);
}

/**
 * Resolve the per-ticket price for a quantity, honouring multi-ticket pricing.
 *
 * Mirrors `PricingService.effective_unit_price`: the tier's multi-ticket price
 * applies once the quantity reaches `multi_ticket_min_qty`.
 */
export function effectiveUnitCents(
  tier: CurrentTier | PricingTier | null,
  quantity: number,
): number {
  if (!tier) return 0;
  const { multi_ticket_min_qty: minQty, multi_ticket_price: multiPrice } = tier;
  if (minQty !== null && multiPrice !== null && quantity >= minQty) {
    return toCents(multiPrice);
  }
  return toCents(tier.price);
}

/** A fully-computed checkout summary, all amounts in integer cents. */
export interface OrderSummary {
  unitCents: number;
  /** Unit price after any applied promo. */
  discountedUnitCents: number;
  ticketsCents: number;
  addOnsCents: number;
  discountCents: number;
  totalCents: number;
  currency: string;
}

/**
 * Compute the checkout summary shown beside the payment form.
 *
 * @param event The public event (supplies the current tier and currency).
 * @param quantity Number of tickets requested.
 * @param addOns Selected add-on lines.
 * @param promo An applied promo preview, if the buyer entered a valid code.
 */
export function computeSummary(
  event: PublicEvent,
  quantity: number,
  addOns: CheckoutAddOnSpec[],
  promo: PromoPreview | null,
): OrderSummary {
  const unitCents = effectiveUnitCents(event.current_tier, quantity);

  // The promo preview is authoritative when present — it was priced by the
  // server for this quantity, so we don't re-derive the discount locally.
  const discountedUnitCents =
    promo?.valid && promo.discounted_unit_price !== undefined
      ? toCents(promo.discounted_unit_price)
      : unitCents;

  const ticketsCents = discountedUnitCents * quantity;
  const addOnsCents = addOns.reduce((sum, line) => {
    const addOn = event.add_ons.find((a) => a.id === line.add_on_id);
    return addOn ? sum + toCents(addOn.unit_price) * line.quantity : sum;
  }, 0);

  return {
    unitCents,
    discountedUnitCents,
    ticketsCents,
    addOnsCents,
    discountCents: (unitCents - discountedUnitCents) * quantity,
    totalCents: ticketsCents + addOnsCents,
    currency: event.payment_currency,
  };
}

/** Return the add-on for a selected line, if it still exists on the event. */
export function findAddOn(event: PublicEvent, addOnId: number): EventAddOn | undefined {
  return event.add_ons.find((addOn) => addOn.id === addOnId);
}
