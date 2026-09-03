/**
 * The running order total shown beside the checkout form.
 *
 * This is a preview computed client-side. The server re-prices every order and
 * the PaymentIntent it creates is what actually gets charged, so this can never
 * change the amount — it only has to agree with it.
 */

import {
  findAddOn,
  formatMoney,
  toCents,
  type OrderSummary as Summary,
} from '../../utils/public-pricing';
import type { CheckoutAddOnSpec, PublicEvent } from '../../types/public';
import { PublicCard } from './public-event-shell';

export function OrderSummaryCard({
  event,
  quantity,
  addOns,
  summary,
  tierLabel,
}: {
  event: PublicEvent;
  quantity: number;
  addOns: CheckoutAddOnSpec[];
  summary: Summary;
  tierLabel: string;
}) {
  const { currency } = summary;
  const discounted = summary.discountCents > 0;

  return (
    <PublicCard className="sticky top-4">
      <h2 className="text-lg font-semibold">Order Summary</h2>

      <dl className="mt-4 space-y-2 text-sm">
        <Row
          label={`${tierLabel} × ${quantity}`}
          value={formatMoney(summary.ticketsCents, currency)}
          sublabel={
            discounted
              ? `${formatMoney(summary.discountedUnitCents, currency)} each (was ${formatMoney(
                  summary.unitCents,
                  currency,
                )})`
              : `${formatMoney(summary.unitCents, currency)} each`
          }
        />

        {addOns.map((line) => {
          const addOn = findAddOn(event, line.add_on_id);
          if (!addOn) return null;
          return (
            <Row
              key={line.add_on_id}
              label={`${addOn.product_name} × ${line.quantity}`}
              value={formatMoney(toCents(addOn.unit_price) * line.quantity, currency)}
            />
          );
        })}

        {discounted ? (
          <Row
            label="Discount"
            value={`−${formatMoney(summary.discountCents, currency)}`}
            tone="positive"
          />
        ) : null}
      </dl>

      <div className="mt-4 flex items-baseline justify-between border-t border-slate-200 pt-4 dark:border-white/10">
        <span className="font-semibold">Total</span>
        <span className="text-2xl font-bold" style={{ color: 'var(--event-brand)' }}>
          {formatMoney(summary.totalCents, currency)}
        </span>
      </div>

      <p className="mt-3 text-xs text-slate-500 dark:text-white/50">
        You'll receive {quantity === 1 ? 'a ticket' : `${quantity} tickets`} by email.
        Attendee names can be assigned after purchase.
      </p>
    </PublicCard>
  );
}

function Row({
  label,
  sublabel,
  value,
  tone,
}: {
  label: string;
  sublabel?: string;
  value: string;
  tone?: 'positive';
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="min-w-0">
        <span className="block">{label}</span>
        {sublabel ? (
          <span className="block text-xs text-slate-500 dark:text-white/50">
            {sublabel}
          </span>
        ) : null}
      </dt>
      <dd
        className={
          tone === 'positive'
            ? 'shrink-0 font-medium text-green-700 dark:text-green-300'
            : 'shrink-0 font-medium'
        }
      >
        {value}
      </dd>
    </div>
  );
}
