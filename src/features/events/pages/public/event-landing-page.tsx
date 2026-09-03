/**
 * Public event landing page — `/event/:shortcut`.
 *
 * A standalone route (no auth, no `MainLayout`). Purely compositional: it
 * fetches once via `usePublicEvent` and hands slices of that payload to
 * section components, each of which self-hides when its data is empty.
 */

import { Link, useParams } from 'react-router-dom';

import { usePublicEvent } from '../../hooks/use-public-event';
import { EventHero } from '../../components/public/event-hero';
import {
  AboutSection,
  AddOnsPreviewSection,
  ContactSection,
  LocationSection,
  RefundPolicySection,
} from '../../components/public/location-section';
import { PartnersSection } from '../../components/public/partners-section';
import { PricingTiersSection } from '../../components/public/pricing-tiers-section';
import { QuestionSection } from '../../components/public/question-section';
import { SpeakersSection } from '../../components/public/speakers-section';
import {
  PublicAlert,
  PublicEventShell,
} from '../../components/public/public-event-shell';

export default function EventLandingPage() {
  const { shortcut } = useParams<{ shortcut: string }>();
  const { event, loading, error, notFound, reload } = usePublicEvent(shortcut);

  if (loading) return <PublicStatus message="Loading event…" />;

  if (notFound) {
    return (
      <PublicStatus
        title="Event not found"
        message="This event either doesn't exist or isn't published yet."
      />
    );
  }

  if (error || !event) {
    return (
      <PublicEventShell narrow>
        <PublicAlert message={error ?? 'Failed to load this event.'} />
        <button
          type="button"
          onClick={reload}
          className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 dark:border-white/20 dark:hover:bg-white/10"
        >
          Try again
        </button>
      </PublicEventShell>
    );
  }

  return (
    <PublicEventShell
      eventName={event.name}
      logoUrl={event.logo_url}
      brand={event.brand_color}
      shortcut={event.shortcut}
      headerAction={
        event.sales_state.is_open ? (
          <Link
            to={`/event/${event.shortcut}/checkout`}
            style={{ backgroundColor: 'var(--event-brand)' }}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-950 hover:opacity-90"
          >
            Get Tickets
          </Link>
        ) : null
      }
    >
      <EventHero event={event} />
      <AboutSection event={event} />
      <PricingTiersSection event={event} />
      <SpeakersSection speakers={event.speakers} />
      <AddOnsPreviewSection event={event} />
      <PartnersSection partners={event.partners} />
      <LocationSection event={event} />
      <RefundPolicySection event={event} />
      <QuestionSection
        shortcut={event.shortcut}
        contactEmail={event.show_email ? event.contact_email : undefined}
      />
      <ContactSection event={event} />
    </PublicEventShell>
  );
}

/** Full-page status message for the load/not-found states. */
function PublicStatus({ title, message }: { title?: string; message: string }) {
  return (
    <PublicEventShell narrow>
      <div className="py-16 text-center">
        {title ? <h1 className="text-2xl font-bold">{title}</h1> : null}
        <p className="mt-2 text-sm text-slate-600 dark:text-white/70">{message}</p>
      </div>
    </PublicEventShell>
  );
}
