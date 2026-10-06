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
import { RichText } from './rich-text';

/** Venue details, with a map link and the optional room-booking URL. */
export function LocationSection({
  event,
  title,
}: {
  event: PublicEvent;
  /** Heading override from the page layout. */
  title?: string;
}) {
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
    <PublicSection title={title || 'Location'}>
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
 * Rich-text "about" / "notes" blocks.
 *
 * Rendered through {@link RichText}: HTML is sanitized server-side on write and
 * on every public read, and legacy plain text stays escaped text.
 */
export function AboutSection({
  event,
  title,
}: {
  event: PublicEvent;
  /** Heading override from the page layout. */
  title?: string;
}) {
  if (!event.about && !event.notes) return null;

  return (
    <PublicSection title={title || 'About This Event'}>
      <PublicCard className="space-y-4">
        {event.about ? (
          <RichText
            value={event.about}
            className="text-sm text-slate-700 dark:text-white/80"
          />
        ) : null}
        {event.notes ? (
          <RichText
            value={event.notes}
            className="text-sm text-slate-600 dark:text-white/60"
          />
        ) : null}
      </PublicCard>
    </PublicSection>
  );
}

/** Read-only preview of purchasable extras; selection happens at checkout. */
export function AddOnsPreviewSection({
  event,
  title,
}: {
  event: PublicEvent;
  /** Heading override from the page layout. */
  title?: string;
}) {
  if (event.add_ons.length === 0) return null;

  return (
    <PublicSection
      title={title || 'Add-Ons'}
      description="Available to add to your order at checkout."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {event.add_ons.map((addOn) => (
          <PublicCard key={addOn.id} className="overflow-hidden p-0">
            {addOn.image_url ? (
              <img
                src={addOn.image_url}
                alt={addOn.product_name}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover"
              />
            ) : null}
            <div className="p-5">
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
            </div>
          </PublicCard>
        ))}
      </div>
    </PublicSection>
  );
}

/** Organizer contact block, gated on the builder's `show_email` toggle. */
export function ContactSection({
  event,
  title,
}: {
  event: PublicEvent;
  /** Heading override from the page layout. */
  title?: string;
}) {
  if (!event.show_email || !event.contact_email) return null;

  return (
    <PublicSection title={title || 'Questions?'}>
      <PublicCard className="overflow-hidden p-0">
        {event.contact_banner_url ? (
          <img
            src={event.contact_banner_url}
            alt=""
            loading="lazy"
            className="h-40 w-full object-cover"
          />
        ) : null}
        <p className="p-5 text-sm">
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
export function RefundPolicySection({
  event,
  title,
}: {
  event: PublicEvent;
  /** Heading override from the page layout. */
  title?: string;
}) {
  if (!event.refund_policy) return null;

  return (
    <PublicSection title={title || 'Refund Policy'}>
      <PublicCard>
        <RichText
          value={event.refund_policy}
          className="text-sm text-slate-700 dark:text-white/70"
        />
      </PublicCard>
    </PublicSection>
  );
}
