/**
 * Ticket pricing display for the landing page.
 *
 * Respects the event's `price_display_mode`: `CURRENT_ONLY` shows just the
 * active tier, while `CURRENT_AND_EXPIRATION` also lists the other tiers with
 * their deadlines, which is how organizers advertise early-bird price jumps.
 *
 * When the section carries value-framing copy (`PricingContent`), the current
 * tier renders as a single "your ticket" value card instead — anchor price,
 * inclusions, CTA, motto, fine print. Copy only: the price shown is always the
 * server's `current_tier`, never computed here.
 */

import { Check } from 'lucide-react';

import { cn } from '@core/utils';

import { DISPLAY_FONT_CLASS } from '../../themes/registry';

import { formatEventDate } from '../../utils/public-dates';
import { formatPrice } from '../../utils/public-pricing';
import type { PublicEvent } from '../../types/public';
import type { PricingTier } from '../../types/config';
import type { PricingContent } from '../../types/landing';
import { Eyebrow, PublicCard, PublicSection } from './public-event-shell';
import { TicketCta } from './ticket-cta';

/**
 * True when the organizer filled any of the value-card copy.
 *
 * `eyebrow` and `button_label` deliberately do not count: they only relabel the
 * card's frame, so on their own they would swap the tier list for a card with
 * nothing but a price and a button. They take effect once real value copy
 * (anchor, inclusions, motto, fine print) turns the card on.
 */
function hasValueCopy(content: PricingContent | undefined): boolean {
  if (!content) return false;
  return Boolean(
    content.anchor_text?.trim() ||
      content.anchor_price?.trim() ||
      content.motto?.trim() ||
      content.fine_print?.trim() ||
      (content.inclusions ?? []).some((i) => i.trim()),
  );
}

export function PricingTiersSection({
  event,
  title,
  content,
}: {
  event: PublicEvent;
  /** Heading override from the page layout. */
  title?: string;
  /** Optional value-card copy stored on the section. */
  content?: PricingContent;
}) {
  const { current_tier: current, pricing_tiers: tiers } = event;
  if (!current && tiers.length === 0) return null;

  const showAll = event.price_display_mode === 'CURRENT_AND_EXPIRATION';
  const others = showAll ? tiers.filter((tier) => tier.id !== current?.id) : [];

  if (current && content && hasValueCopy(content)) {
    return (
      <PublicSection title={title || undefined}>
        <ValueCard event={event} content={content} />
        {others.length > 0 ? (
          <div className="mx-auto mt-4 grid max-w-3xl gap-4 sm:grid-cols-2">
            {others.map((tier) => (
              <TierCard key={tier.id} tier={tier} event={event} />
            ))}
          </div>
        ) : null}
      </PublicSection>
    );
  }

  return (
    <PublicSection title={title || 'Tickets'}>
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
            {(current.quantity_breaks ?? []).map((row) => (
              <p key={row.min_qty} className="mt-2 text-xs text-slate-600 dark:text-white/60">
                {formatPrice(row.unit_price, event.payment_currency)} each when you buy{' '}
                {row.min_qty} or more
              </p>
            ))}
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

/** The single "your ticket" card: anchor, price, inclusions, CTA, motto. */
function ValueCard({
  event,
  content,
}: {
  event: PublicEvent;
  content: PricingContent;
}) {
  const current = event.current_tier;
  if (!current) return null;
  const inclusions = (content.inclusions ?? []).filter((i) => i.trim());
  const muted = 'text-slate-600 dark:text-white/60';

  return (
    <PublicCard className="mx-auto max-w-md !border-[color:color-mix(in_srgb,var(--event-brand)_55%,transparent)] px-6 py-8 text-center sm:px-8">
      <Eyebrow>{content.eyebrow?.trim() || 'Your ticket'}</Eyebrow>
      {content.anchor_text ? (
        <p className={cn('mt-4 text-sm', muted)}>{content.anchor_text}</p>
      ) : null}
      {content.anchor_price ? (
        <p className={cn('mt-1 text-sm line-through', muted)}>
          {content.anchor_price}
        </p>
      ) : null}
      <div
        className={cn(
          'mt-2 text-6xl font-black leading-none tabular-nums sm:text-7xl',
          DISPLAY_FONT_CLASS,
        )}
        style={{
          color: 'var(--event-brand)',
          textShadow:
            '0 0 28px color-mix(in srgb, var(--event-brand) 35%, transparent)',
        }}
      >
        {formatPrice(current.price, event.payment_currency)}
      </div>
      {current.label ? (
        <p className="mt-4 font-bold">{current.label}</p>
      ) : null}
      {current.expiration_date ? (
        <p className={cn('mt-1 text-xs', muted)}>
          Price increases after{' '}
          {formatEventDate(current.expiration_date, event.timezone)}
        </p>
      ) : null}

      {inclusions.length > 0 ? (
        <ul className="mx-auto mt-6 max-w-xs space-y-2 text-left text-sm">
          {inclusions.map((line, index) => (
            <li key={index} className="flex gap-2.5">
              <Check
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: 'var(--event-brand)' }}
                aria-hidden="true"
              />
              <span className="text-slate-700 dark:text-white/80">{line}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <TicketCta
        event={event}
        label={content.button_label?.trim() || undefined}
        className="mt-7 w-full"
      />

      {content.motto ? (
        <p
          className="mt-5 text-sm font-bold"
          style={{ color: 'var(--event-brand)' }}
        >
          {content.motto}
        </p>
      ) : null}
      {content.fine_print ? (
        <p className={cn('mt-4 whitespace-pre-line text-[11px] leading-relaxed', muted)}>
          {content.fine_print}
        </p>
      ) : null}
    </PublicCard>
  );
}
