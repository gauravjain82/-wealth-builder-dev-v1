/**
 * Public event landing page — `/event/:shortcut`.
 *
 * A standalone route (no auth, no `MainLayout`). Purely compositional: it
 * fetches once via `usePublicEvent`, renders the themed hero, then the
 * organizer's ordered sections (`LandingSections`), each of which self-hides
 * when its data is empty.
 */

import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { usePublicEvent } from '../../hooks/use-public-event';
import { EventHero } from '../../components/public/event-hero';
import { LandingSections } from '../../components/public/landing-sections';
import {
  PublicAlert,
  PublicEventShell,
  TicketsLink,
} from '../../components/public/public-event-shell';

export default function EventLandingPage() {
  const { shortcut } = useParams<{ shortcut: string }>();
  const { event, loading, error, notFound, reload } = usePublicEvent(shortcut);
  useDocumentMeta(event?.name, event?.about);

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
      animated
      eventName={event.name}
      logoUrl={event.logo_url}
      brand={event.brand_color}
      theme={event.theme}
      shortcut={event.shortcut}
      hero={<EventHero event={event} />}
      headerAction={
        event.sales_state.is_open ? (
          // Scrolls to the inline form when the layout has one (`#tickets`),
          // else links to the checkout route.
          <TicketsLink event={event} className="px-4 py-2">
            Get Tickets
          </TicketsLink>
        ) : null
      }
    >
      <LandingSections event={event} />
    </PublicEventShell>
  );
}

/**
 * Title + meta description for the browser tab, bookmarks and JS-rendering
 * crawlers. (Link-preview bots that don't run JS need server-side OG tags,
 * which this SPA cannot provide.)
 */
function useDocumentMeta(name: string | undefined, about: string | undefined) {
  useEffect(() => {
    if (!name) return;
    const previousTitle = document.title;
    document.title = name;

    // `about` may be rich-text HTML; parse it inertly to get plain text.
    const text = about
      ? (new DOMParser().parseFromString(about, 'text/html').body.textContent ?? '')
      : '';
    const description = text.replace(/\s+/g, ' ').trim().slice(0, 160);
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const created = !meta;
    const previousDescription = meta?.content;
    if (description) {
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    }

    return () => {
      document.title = previousTitle;
      if (created) meta?.remove();
      else if (meta && previousDescription !== undefined) meta.content = previousDescription;
    };
  }, [name, about]);
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
