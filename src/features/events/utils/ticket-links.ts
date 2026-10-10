/**
 * Where a "get tickets" call to action points.
 *
 * When the landing layout includes the inline `checkout` section, every ticket
 * CTA on the landing page scrolls to it (`#tickets`) instead of leaving for the
 * standalone checkout route. The route keeps working either way — it is still
 * where a shared or bookmarked checkout link lands.
 */

import type { MouseEvent } from 'react';

import type { CheckoutContent } from '../types/landing';
import type { PublicEvent } from '../types/public';

/** DOM id of the inline purchase section (`InlineCheckoutSection`). */
export const TICKETS_ANCHOR_ID = 'tickets';

/** True when the landing page renders the purchase form inline. */
export function hasInlineCheckout(event: Pick<PublicEvent, 'sections'>): boolean {
  return Boolean(
    event.sections?.some(
      (section) => section.section_type === 'checkout' && section.is_enabled,
    ),
  );
}

/**
 * True when the top bar should offer the scan-to-buy QR code: the form is on
 * the page (so `#tickets` lands on it) and the organizer has not turned the
 * code off on the `checkout` section (`show_qr`, absent → shown).
 */
export function showsTicketsQr(event: Pick<PublicEvent, 'sections'>): boolean {
  const checkout = event.sections?.find(
    (section) => section.section_type === 'checkout' && section.is_enabled,
  );
  return Boolean(checkout) && (checkout?.content as CheckoutContent).show_qr !== false;
}

/** `#tickets` when the form is on the page, else the checkout route. */
export function ticketsHref(event: Pick<PublicEvent, 'sections' | 'shortcut'>): string {
  return hasInlineCheckout(event)
    ? `#${TICKETS_ANCHOR_ID}`
    : `/event/${event.shortcut}/checkout`;
}

/**
 * The absolute link that opens an event's landing page at the purchase form —
 * what the scan-to-buy QR code encodes (`TicketsQr`).
 */
export function ticketsShareUrl(shortcut: string): string {
  return `${window.location.origin}/event/${shortcut}#${TICKETS_ANCHOR_ID}`;
}

/**
 * Smooth-scroll to an in-page anchor (instant under reduced motion) and keep
 * the hash in the URL without adding a history entry. Falls back to the
 * browser's own jump when the target isn't mounted.
 */
export function scrollToAnchor(e: MouseEvent<HTMLAnchorElement>, id: string): void {
  const target = document.getElementById(id);
  if (!target) return;
  e.preventDefault();
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  window.history.replaceState(window.history.state, '', `#${id}`);
}
