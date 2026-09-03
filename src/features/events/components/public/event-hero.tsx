/**
 * Landing-page hero: banner, event name, date/venue, countdown, and the
 * primary "get tickets" call to action.
 *
 * The CTA's label and enabled state come from the server-computed
 * `sales_state`, so the button never invites a click that checkout would
 * reject (sold out, window closed, no tier configured).
 */

import { Link } from 'react-router-dom';

import { formatEventRange } from '../../utils/public-dates';
import { formatPrice } from '../../utils/public-pricing';
import type { PublicEvent } from '../../types/public';
import { EventCountdown } from './event-countdown';

/** CTA label per sales reason; `OPEN` is handled separately (it shows a price). */
const CLOSED_CTA_LABEL: Record<string, string> = {
  NOT_STARTED: 'Sales Not Open Yet',
  ENDED: 'Sales Closed',
  SOLD_OUT: 'Sold Out',
  NO_TIER: 'Tickets Unavailable',
};

export function EventHero({ event }: { event: PublicEvent }) {
  const { sales_state: sales, current_tier: tier } = event;
  const dateLine = formatEventRange(event.begin_at, event.end_at, event.timezone);
  const venueLine = [event.venue_name, event.location_name]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 text-white shadow-sm dark:border-white/10">
      {event.event_banner_url ? (
        <img
          src={event.event_banner_url}
          alt={`${event.name} banner`}
          className="h-48 w-full object-cover sm:h-64 md:h-80"
        />
      ) : null}

      <div className="p-6 sm:p-8">
        <h1 className="text-3xl font-bold sm:text-4xl">{event.name}</h1>
        <p className="mt-2 text-sm text-white/80">{dateLine}</p>
        {venueLine ? (
          <p className="text-sm text-white/70">{venueLine}</p>
        ) : null}

        {event.show_countdown ? (
          <div className="mt-6">
            <EventCountdown beginAt={event.begin_at} />
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {sales.is_open ? (
            <Link
              to={`/event/${event.shortcut}/checkout`}
              style={{ backgroundColor: 'var(--event-brand)' }}
              className="rounded-lg px-6 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90"
            >
              {tier
                ? `Get Tickets — ${formatPrice(tier.price, event.payment_currency)}`
                : 'Get Tickets'}
            </Link>
          ) : (
            <span
              className="cursor-not-allowed rounded-lg bg-white/15 px-6 py-3 text-sm font-semibold text-white/60"
              aria-disabled="true"
            >
              {CLOSED_CTA_LABEL[sales.reason] ?? 'Tickets Unavailable'}
            </span>
          )}

          {event.flyer_url ? (
            <a
              href={event.flyer_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-white/30 px-5 py-3 text-sm font-medium hover:bg-white/10"
            >
              View Flyer
            </a>
          ) : null}

          <Link
            to={`/event/${event.shortcut}/transfer`}
            className="rounded-lg border border-white/30 px-5 py-3 text-sm font-medium hover:bg-white/10"
          >
            Manage My Tickets
          </Link>
        </div>

        <SalesNotice event={event} />
      </div>
    </section>
  );
}

/** Scarcity / closure messaging under the CTA. */
function SalesNotice({ event }: { event: PublicEvent }) {
  const { sales_state: sales } = event;

  if (!sales.is_open && sales.message) {
    return <p className="mt-3 text-sm text-amber-200">{sales.message}</p>;
  }

  // Only nudge when the remaining count is genuinely low — showing "412 left"
  // is noise, and uncapped events report `null`.
  if (sales.is_open && sales.tickets_remaining !== null && sales.tickets_remaining <= 25) {
    return (
      <p className="mt-3 text-sm text-amber-200">
        Only {sales.tickets_remaining} ticket
        {sales.tickets_remaining === 1 ? '' : 's'} left.
      </p>
    );
  }

  return null;
}
