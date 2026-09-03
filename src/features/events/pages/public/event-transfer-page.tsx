/**
 * Public "manage my tickets" page — `/event/:shortcut/transfer`.
 *
 * Standalone route with no login. A purchaser proves ownership with the email
 * they bought with plus their invoice number (the model BSCpro uses), then
 * assigns attendee names or transfers tickets to other people.
 *
 * The proof is re-sent with every mutation because the backend is stateless
 * here — there is no session to establish. That also means the "sign out"
 * action is purely local: it just drops the proof from component state.
 */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useToastStore } from '@/store';

import { usePublicEvent } from '../../hooks/use-public-event';
import { useTicketClaim } from '../../hooks/use-ticket-claim';
import { ClaimedTicketRow } from '../../components/public/claimed-ticket-row';
import { PUBLIC_FIELD_CLASS } from '../../utils/public-brand';
import {
  BrandButton,
  PublicAlert,
  PublicCard,
  PublicEventShell,
  PublicField,
} from '../../components/public/public-event-shell';

export default function EventTransferPage() {
  const { shortcut = '' } = useParams<{ shortcut: string }>();
  const { event } = usePublicEvent(shortcut);
  const addToast = useToastStore((state) => state.addToast);
  const claimState = useTicketClaim(shortcut);
  const { claim, proof } = claimState;

  const handleAssign = async (
    ticketId: number,
    holder: {
      first_name: string;
      last_name: string;
      holder_email: string;
      phone?: string;
    },
  ) => {
    const ok = await claimState.assign(ticketId, holder);
    addToast(
      ok
        ? { type: 'success', message: 'Attendee saved and their ticket emailed.' }
        : { type: 'error', message: claimState.error ?? 'Could not save attendee.' },
    );
    return ok;
  };

  const handleTransfer = async (
    ticketId: number,
    recipient: { to_email: string; to_name?: string },
  ) => {
    const ok = await claimState.transfer(ticketId, recipient);
    addToast(
      ok
        ? { type: 'success', message: `Ticket transferred to ${recipient.to_email}.` }
        : { type: 'error', message: claimState.error ?? 'Could not transfer ticket.' },
    );
    return ok;
  };

  return (
    <PublicEventShell
      eventName={event?.name ?? claim?.event_name}
      logoUrl={event?.logo_url}
      brand={event?.brand_color}
      shortcut={shortcut}
      narrow
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Manage Your Tickets</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-white/70">
          Name your attendees or pass a ticket to someone else.
        </p>
        <Link
          to={`/event/${shortcut}`}
          className="mt-2 inline-block text-sm underline underline-offset-2 hover:opacity-80"
        >
          ← Back to event
        </Link>
      </div>

      {!proof || !claim ? (
        <ClaimForm
          loading={claimState.loading}
          error={claimState.error}
          onSubmit={claimState.lookup}
        />
      ) : (
        <div className="space-y-4">
          <PublicCard className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{claim.event_name}</div>
              <div className="text-xs text-slate-600 dark:text-white/60">
                Invoice {claim.invoice_number}
                {claim.purchaser_name ? ` · ${claim.purchaser_name}` : ''}
              </div>
            </div>
            <button
              type="button"
              onClick={claimState.signOut}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100 dark:border-white/20 dark:hover:bg-white/10"
            >
              Look up another order
            </button>
          </PublicCard>

          {claimState.error ? <PublicAlert message={claimState.error} /> : null}

          {claim.tickets.length === 0 ? (
            <PublicAlert
              tone="info"
              message="There are no active tickets on this order."
            />
          ) : (
            claim.tickets.map((ticket) => (
              <ClaimedTicketRow
                key={ticket.id}
                ticket={ticket}
                claim={claim}
                busy={claimState.pendingTicketId === ticket.id}
                onAssign={(holder) => handleAssign(ticket.id, holder)}
                onTransfer={(recipient) => handleTransfer(ticket.id, recipient)}
              />
            ))
          )}
        </div>
      )}
    </PublicEventShell>
  );
}

/** Email + invoice-number lookup form (the ownership proof). */
function ClaimForm({
  loading,
  error,
  onSubmit,
}: {
  loading: boolean;
  error: string | null;
  onSubmit: (proof: { email: string; invoice_number: string }) => Promise<boolean>;
}) {
  const [email, setEmail] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  const incomplete = !email.trim() || !invoiceNumber.trim();

  return (
    <PublicCard>
      <h2 className="text-lg font-semibold">Find your order</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-white/70">
        Enter the email you purchased with and the invoice number from your
        confirmation email.
      </p>

      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!incomplete) {
            void onSubmit({
              email: email.trim(),
              invoice_number: invoiceNumber.trim(),
            });
          }
        }}
      >
        <PublicField label="Email" required>
          <input
            type="email"
            className={PUBLIC_FIELD_CLASS}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </PublicField>
        <PublicField label="Invoice number" required hint="For example: SUMMIT2026-00042">
          <input
            type="text"
            className={PUBLIC_FIELD_CLASS}
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            disabled={loading}
            required
          />
        </PublicField>

        {error ? <PublicAlert message={error} /> : null}

        <BrandButton type="submit" disabled={loading || incomplete}>
          {loading ? 'Looking up…' : 'Find My Tickets'}
        </BrandButton>
      </form>
    </PublicCard>
  );
}
