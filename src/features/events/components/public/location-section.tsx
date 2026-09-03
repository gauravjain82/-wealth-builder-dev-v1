/**
 * Venue, contact, and add-on preview blocks for the landing page.
 *
 * These are small, independent read-only sections that each render nothing when
 * the organizer left the corresponding builder tab empty — the landing page
 * composes whichever ones have content.
 */

import { formatPrice } from '../../utils/public-pricing';
import type { PublicEvent } from '../../types/public';
import { PublicCard, PublicSection } from './public-event-shell';

/** Venue details, with a map link and the optional room-booking URL. */
export function LocationSection({ event }: { event: PublicEvent }) {
  const hasContent =
    event.venue_name ||
    event.location_name ||
    event.address ||
    event.location_details;
  if (!hasContent) return null;

  const mapQuery = encodeURIComponent(
    [event.venue_name, event.address].filter(Boolean).join(', '),
  );

  return (
    <PublicSection title="Location">
      <PublicCard>
        {event.location_banner_url ? (
          <img
            src={event.location_banner_url}
            alt={`${event.venue_name || event.name} venue`}
            className="mb-4 h-40 w-full rounded-xl object-cover"
          />
        ) : null}

        {event.venue_name ? (
          <div className="text-lg font-semibold">{event.venue_name}</div>
        ) : null}
        {event.location_name && event.location_name !== event.venue_name ? (
          <div className="text-sm text-slate-600 dark:text-white/70">
            {event.location_name}
          </div>
        ) : null}
        {event.address ? (
          <p className="mt-2 whitespace-pre-line text-sm text-slate-700 dark:text-white/70">
            {event.address}
          </p>
        ) : null}
        {event.location_phone ? (
          <p className="mt-2 text-sm">
            <a href={`tel:${event.location_phone}`} className="hover:underline">
              {event.location_phone}
            </a>
          </p>
        ) : null}
        {event.location_details ? (
          <p className="mt-3 whitespace-pre-line text-sm text-slate-700 dark:text-white/70">
            {event.location_details}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          {event.address ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-100 dark:border-white/20 dark:hover:bg-white/10"
            >
              Open in Maps
            </a>
          ) : null}
          {event.book_room_url ? (
            <a
              href={event.book_room_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-100 dark:border-white/20 dark:hover:bg-white/10"
            >
              Book a Room
            </a>
          ) : null}
        </div>
      </PublicCard>
    </PublicSection>
  );
}

/**
 * Free-text "about" / "notes" blocks.
 *
 * These fields accept raw HTML from the builder's textarea. They are rendered as
 * plain text (`whitespace-pre-line`) rather than via `dangerouslySetInnerHTML`:
 * organizer input is not sanitized anywhere in the pipeline, so injecting it
 * into this unauthenticated page would be a stored-XSS vector.
 */
export function AboutSection({ event }: { event: PublicEvent }) {
  if (!event.about && !event.notes) return null;

  return (
    <PublicSection title="About This Event">
      <PublicCard className="space-y-4">
        {event.about ? (
          <p className="whitespace-pre-line text-sm text-slate-700 dark:text-white/80">
            {event.about}
          </p>
        ) : null}
        {event.notes ? (
          <p className="whitespace-pre-line text-sm text-slate-600 dark:text-white/60">
            {event.notes}
          </p>
        ) : null}
      </PublicCard>
    </PublicSection>
  );
}

/** Read-only preview of purchasable extras; selection happens at checkout. */
export function AddOnsPreviewSection({ event }: { event: PublicEvent }) {
  if (event.add_ons.length === 0) return null;

  return (
    <PublicSection
      title="Add-Ons"
      description="Available to add to your order at checkout."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {event.add_ons.map((addOn) => (
          <PublicCard key={addOn.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="font-semibold">{addOn.product_name}</div>
              <div className="shrink-0 font-semibold">
                {formatPrice(addOn.unit_price, event.payment_currency)}
              </div>
            </div>
            {addOn.description ? (
              <p className="mt-2 text-sm text-slate-700 dark:text-white/70">
                {addOn.description}
              </p>
            ) : null}
            {addOn.stock !== null ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-white/50">
                {Math.max(0, addOn.stock - addOn.sold)} remaining
              </p>
            ) : null}
          </PublicCard>
        ))}
      </div>
    </PublicSection>
  );
}

/** Organizer contact block, gated on the builder's `show_email` toggle. */
export function ContactSection({ event }: { event: PublicEvent }) {
  if (!event.show_email || !event.contact_email) return null;

  return (
    <PublicSection title="Questions?">
      <PublicCard>
        <p className="text-sm">
          Contact the organizer at{' '}
          <a
            href={`mailto:${event.contact_email}`}
            className="font-medium underline underline-offset-2"
            style={{ color: 'var(--event-brand)' }}
          >
            {event.contact_email}
          </a>
        </p>
      </PublicCard>
    </PublicSection>
  );
}

/** Refund policy, shown on both the landing page and checkout. */
export function RefundPolicySection({ event }: { event: PublicEvent }) {
  if (!event.refund_policy) return null;

  return (
    <PublicSection title="Refund Policy">
      <PublicCard>
        <p className="whitespace-pre-line text-sm text-slate-700 dark:text-white/70">
          {event.refund_policy}
        </p>
      </PublicCard>
    </PublicSection>
  );
}
