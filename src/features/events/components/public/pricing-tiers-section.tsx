/**
 * Ticket pricing display for the landing page.
 *
 * Respects the event's `price_display_mode`: `CURRENT_ONLY` shows just the
 * active tier, while `CURRENT_AND_EXPIRATION` also lists the other tiers with
 * their deadlines, which is how organizers advertise early-bird price jumps.
 */

import { formatEventDate } from '../../utils/public-dates';
import { formatPrice } from '../../utils/public-pricing';
import type { PublicEvent } from '../../types/public';
import type { PricingTier } from '../../types/config';
import { PublicCard, PublicSection } from './public-event-shell';

export function PricingTiersSection({ event }: { event: PublicEvent }) {
  const { current_tier: current, pricing_tiers: tiers } = event;
  if (!current && tiers.length === 0) return null;

  const showAll = event.price_display_mode === 'CURRENT_AND_EXPIRATION';
  const others = showAll ? tiers.filter((tier) => tier.id !== current?.id) : [];

  return (
    <PublicSection title="Tickets">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {current ? (
          <PublicCard className="border-2">
            <div
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--event-brand)' }}
            >
              Current price
            </div>
            <div className="mt-1 text-lg font-semibold">{current.label}</div>
            <div className="mt-2 text-3xl font-bold">
              {formatPrice(current.price, event.payment_currency)}
            </div>
            {current.expiration_date ? (
              <p className="mt-2 text-xs text-slate-600 dark:text-white/60">
                Price increases after{' '}
                {formatEventDate(current.expiration_date, event.timezone)}
              </p>
            ) : null}
            {current.multi_ticket_min_qty !== null &&
            current.multi_ticket_price !== null ? (
              <p className="mt-2 text-xs text-slate-600 dark:text-white/60">
                {formatPrice(current.multi_ticket_price, event.payment_currency)} each
                when you buy {current.multi_ticket_min_qty} or more
              </p>
            ) : null}
          </PublicCard>
        ) : null}

        {others.map((tier) => (
          <TierCard key={tier.id} tier={tier} event={event} />
        ))}
      </div>
    </PublicSection>
  );
}

/** A non-current tier, dimmed and annotated with its window. */
function TierCard({ tier, event }: { tier: PricingTier; event: PublicEvent }) {
  const windowNote = tier.expiration_date
    ? `Until ${formatEventDate(tier.expiration_date, event.timezone)}`
    : tier.active_from
      ? `From ${formatEventDate(tier.active_from, event.timezone)}`
      : null;

  return (
    <PublicCard className="opacity-70">
      <div className="text-lg font-semibold">{tier.label}</div>
      <div className="mt-2 text-2xl font-bold">
        {formatPrice(tier.price, event.payment_currency)}
      </div>
      {windowNote ? (
        <p className="mt-2 text-xs text-slate-600 dark:text-white/60">{windowNote}</p>
      ) : null}
    </PublicCard>
  );
}
