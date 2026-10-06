/**
 * Ticket CTAs used inside landing sections (tagline, pricing value card,
 * closing CTA band).
 *
 * `TicketCta` wraps the shell's `TicketsLink` (which jumps to `#tickets` when
 * the page has an inline checkout, else links to the checkout route) and adds
 * the `sales_state` check `TicketsLink` leaves to callers, so a section never
 * invites a click checkout would reject. `OutlineLink` is the secondary,
 * outlined button beside it.
 */

import type { ReactNode } from 'react';

import { cn } from '@core/utils';

import { useEventTheme } from '../../themes/theme-context';
import type { PublicEvent } from '../../types/public';
import { TicketsLink, type BrandButtonSize } from './public-event-shell';

const CLOSED_LABEL: Record<string, string> = {
  NOT_STARTED: 'Sales Not Open Yet',
  ENDED: 'Sales Closed',
  SOLD_OUT: 'Sold Out',
  NO_TIER: 'Tickets Unavailable',
};

/** Metallic (Champion) buttons are uppercase, letter-spaced and heavy. */
function useSecondaryClass(): string {
  const theme = useEventTheme();
  return cn(
    'inline-flex items-center justify-center text-center transition',
    theme.button === 'metallic'
      ? 'px-6 py-3 text-xs font-extrabold uppercase tracking-[0.14em]'
      : 'px-5 py-2.5 text-sm font-semibold',
  );
}

export function TicketCta({
  event,
  label,
  whenClosed = 'disabled',
  size = 'lg',
  className,
}: {
  event: PublicEvent;
  /** Button text while sales are open (blank → the theme's default). */
  label?: string;
  /** Closed sales: show a disabled button with the reason, or render nothing. */
  whenClosed?: 'disabled' | 'hide';
  size?: BrandButtonSize;
  className?: string;
}) {
  const theme = useEventTheme();
  const secondary = useSecondaryClass();
  const sales = event.sales_state;

  if (!sales.is_open) {
    if (whenClosed === 'hide') return null;
    return (
      <span
        aria-disabled="true"
        className={cn(
          secondary,
          'cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-white/50',
          className,
        )}
        style={{ borderRadius: 'var(--event-btn-radius)' }}
      >
        {CLOSED_LABEL[sales.reason] ?? 'Tickets Unavailable'}
      </span>
    );
  }

  const text =
    label || (theme.button === 'metallic' ? 'Claim your seat' : 'Get your ticket');
  return (
    <TicketsLink event={event} size={size} className={className}>
      {text}
    </TicketsLink>
  );
}

/** Secondary outline link (tagline links). External URLs open a new tab. */
export function OutlineLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const base = useSecondaryClass();
  const external = /^https?:\/\//i.test(href);
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      className={cn(base, 'border hover:bg-black/5 dark:hover:bg-white/5', className)}
      style={{
        borderRadius: 'var(--event-btn-radius)',
        borderColor: 'color-mix(in srgb, var(--event-brand) 35%, transparent)',
        color: 'var(--event-brand)',
      }}
    >
      {children}
    </a>
  );
}
