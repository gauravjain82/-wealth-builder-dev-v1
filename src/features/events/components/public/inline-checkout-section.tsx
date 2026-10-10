/**
 * The purchase form rendered inline on the landing page (`checkout` section).
 *
 * Renders at anchor `#tickets` (`TICKETS_ANCHOR_ID`), which every ticket CTA
 * on the page targets while this section is in the layout. Shares the form
 * with the standalone checkout route (`CheckoutForm`, `useEventCheckout`), so
 * pricing display, validation and the Stripe step behave identically.
 *
 * Stripe.js is not loaded with the page: it is requested once the section
 * comes within ~800px of the viewport (or on submit, whichever is first).
 * Closed sales show the server's message and no form.
 *
 * Above the form sits a scan-to-buy QR code (`TicketsQr`) unless the section's
 * content turns it off; it goes away once the buyer is past the form.
 */

import { useEffect, useRef, useState } from 'react';

import { useEventCheckout } from '../../hooks/use-event-checkout';
import type { CheckoutContent } from '../../types/landing';
import type { PublicEvent } from '../../types/public';
import { getStripe } from '../../utils/stripe-loader';
import { TICKETS_ANCHOR_ID } from '../../utils/ticket-links';
import { CheckoutConfirmation, CheckoutForm } from './checkout-form';
import { PublicCard, PublicSection } from './public-event-shell';
import { TicketsQr } from './tickets-qr';

export interface InlineCheckoutSectionProps {
  event: PublicEvent;
  /** Heading override; blank uses the default heading. */
  title: string;
  /** Optional anchor price and QR switch; absent from an older backend. */
  content?: CheckoutContent;
}

/** Matches the `checkout` defaultTitle in themes/section-meta.ts. */
const DEFAULT_TITLE = 'Get Your Ticket';

export function InlineCheckoutSection({ event, title, content }: InlineCheckoutSectionProps) {
  const checkout = useEventCheckout(event.shortcut);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [stripeWanted, setStripeWanted] = useState(
    () => typeof IntersectionObserver === 'undefined',
  );
  const sales = event.sales_state;
  // Keep the form mounted through payment even if sales flip while paying.
  const showForm = sales.is_open || checkout.stage !== 'form';

  // Request Stripe.js once the form is close to view.
  useEffect(() => {
    const node = anchorRef.current;
    if (!node || stripeWanted || !showForm) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setStripeWanted(true);
          observer.disconnect();
        }
      },
      { rootMargin: '800px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [stripeWanted, showForm]);

  // The payment step needs Stripe even if the observer never fired.
  const needStripe = stripeWanted || checkout.stage !== 'form';
  const stripe = needStripe ? getStripe() : null;

  // A link to `/event/x#tickets` arrives before the section exists (the page
  // renders after the fetch), so the browser's own jump misses. Do it here.
  useEffect(() => {
    if (window.location.hash === `#${TICKETS_ANCHOR_ID}`) {
      document.getElementById(TICKETS_ANCHOR_ID)?.scrollIntoView({ block: 'start' });
    }
  }, []);

  // The card step and the confirmation are far shorter than the form they
  // replace, so the page would be left showing whatever section came next.
  const stage = checkout.stage;
  useEffect(() => {
    if (stage === 'paying' || stage === 'complete') {
      document.getElementById(TICKETS_ANCHOR_ID)?.scrollIntoView({ block: 'start' });
    }
  }, [stage]);

  return (
    <PublicSection id={TICKETS_ANCHOR_ID} title={title || DEFAULT_TITLE}>
      {sales.is_open && checkout.stage === 'form' && content?.show_qr !== false ? (
        <TicketsQr event={event} />
      ) : null}
      <div ref={anchorRef}>
        {checkout.stage === 'complete' ? (
          <div className="mx-auto max-w-xl">
            <CheckoutConfirmation event={event} checkout={checkout} />
          </div>
        ) : showForm ? (
          <CheckoutForm
            event={event}
            checkout={checkout}
            stripe={stripe}
            layout="inline"
            anchorPrice={content?.anchor_price}
          />
        ) : (
          <PublicCard className="mx-auto max-w-xl text-center">
            <p className="text-base font-semibold">
              {sales.message || 'Tickets are not currently on sale.'}
            </p>
          </PublicCard>
        )}
      </div>
    </PublicSection>
  );
}
