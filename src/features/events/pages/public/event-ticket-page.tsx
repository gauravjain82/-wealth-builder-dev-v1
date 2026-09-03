/**
 * Hosted ticket page — `/event/ticket/:qrToken`.
 *
 * This is the QR code's own target and the canonical way an attendee shows
 * their ticket. Reachable with no account: the token in the URL *is* the
 * credential, which is what lets an emailed link work for a guest purchaser.
 *
 * Built to be printed as well as shown on a phone — hence the print button and
 * the `print:` utility classes that strip chrome from the printed output.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { formatEventRange } from '../../utils/public-dates';
import { publicEventService } from '../../services/public-event-service';
import type { PublicTicket } from '../../types/public';
import { TicketQr } from '../../components/public/ticket-qr';
import { brandColor } from '../../utils/public-brand';
import {
  PublicAlert,
  PublicCard,
  PublicEventShell,
} from '../../components/public/public-event-shell';

export default function EventTicketPage() {
  const { qrToken = '' } = useParams<{ qrToken: string }>();
  const [ticket, setTicket] = useState<PublicTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTicket(await publicEventService.getTicket(qrToken));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'This ticket could not be found.',
      );
    } finally {
      setLoading(false);
    }
  }, [qrToken]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <PublicEventShell narrow>
        <p className="py-16 text-center text-sm text-slate-600 dark:text-white/70">
          Loading your ticket…
        </p>
      </PublicEventShell>
    );
  }

  if (error || !ticket) {
    return (
      <PublicEventShell narrow>
        <div className="py-12">
          <PublicAlert message={error ?? 'This ticket could not be found.'} />
        </div>
      </PublicEventShell>
    );
  }

  return <TicketView ticket={ticket} />;
}

function TicketView({ ticket }: { ticket: PublicTicket }) {
  const isVoid = ticket.lifecycle_status !== 'ACTIVE';
  const brand = brandColor(ticket.brand_color);
  const dateLine = formatEventRange(
    ticket.event_begin_at,
    ticket.event_end_at,
    ticket.event_timezone,
  );

  return (
    <PublicEventShell
      eventName={ticket.event_name}
      logoUrl={ticket.logo_url}
      brand={ticket.brand_color}
      shortcut={ticket.event_shortcut}
      narrow
    >
      <PublicCard className="print:border-0 print:shadow-none">
        <div className="text-center">
          <h1 className="text-xl font-bold">{ticket.event_name}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-white/70">{dateLine}</p>
          {ticket.venue_name || ticket.location_name ? (
            <p className="text-sm text-slate-600 dark:text-white/70">
              {[ticket.venue_name, ticket.location_name].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </div>

        {isVoid ? (
          <div className="mt-4">
            <PublicAlert
              tone="error"
              message={`This ticket is ${ticket.lifecycle_status.toLowerCase()} and cannot be used for entry.`}
            />
          </div>
        ) : null}

        <div className="mt-6 flex flex-col items-center">
          <TicketQr
            value={window.location.href}
            muted={isVoid}
          />
          <p className="mt-3 font-mono text-sm tracking-wide">
            {ticket.ticket_number}
          </p>
          {ticket.is_checked_in ? (
            <span className="mt-2 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-500/15 dark:text-green-200">
              Checked in
            </span>
          ) : null}
        </div>

        <dl className="mt-6 space-y-2 border-t border-slate-200 pt-4 text-sm dark:border-white/10">
          <DetailRow label="Attendee" value={ticket.holder_name} emphasis={brand} />
          {ticket.holder_email ? (
            <DetailRow label="Email" value={ticket.holder_email} />
          ) : null}
          {ticket.address ? <DetailRow label="Address" value={ticket.address} /> : null}
        </dl>

        {ticket.assignment_status === 'UNASSIGNED' && !isVoid ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
            No attendee is named on this ticket yet. The purchaser can assign one
            from the manage-tickets page.
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-center gap-3 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            style={{ backgroundColor: brand }}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-950 hover:opacity-90"
          >
            Print Ticket
          </button>
          <Link
            to={`/event/${ticket.event_shortcut}`}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm hover:bg-slate-100 dark:border-white/20 dark:hover:bg-white/10"
          >
            Event Details
          </Link>
        </div>
      </PublicCard>
    </PublicEventShell>
  );
}

function DetailRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-slate-500 dark:text-white/50">{label}</dt>
      <dd
        className="text-right font-medium"
        style={emphasis ? { color: emphasis } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}
