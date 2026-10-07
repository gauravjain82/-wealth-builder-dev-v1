import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Button, Card, CardContent, ErrorState, Heading, LoadingState, Text } from '@shared/components';
import { useToastStore } from '@/store';
import { useMyTickets } from '../hooks/use-my-tickets';
import { useMySchedule } from '../hooks/use-my-schedule';
import { MySchedulePanel } from '../components/attendee/my-schedule-panel';
import { eventService } from '../services/event-service';
import { orderService } from '../services/order-service';
import { EventSubnav } from '../components/event-subnav';
import { MyTicketsTable } from '../components/my-tickets-table';
import { AssignTicketModal } from '../components/assign-ticket-modal';
import { TransferTicketModal } from '../components/transfer-ticket-modal';
import { HandOverTicketModal } from '../components/hand-over-ticket-modal';
import { HeldTicketsSection } from '../components/held-tickets-section';
import type {
  AssignHolderPayload,
  EventTicket,
  HandOverPayload,
  HeldTicket,
  TransferPayload,
} from '../types/ticket';
import type { BigEvent } from '../types/event';

export default function EventMyTicketsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const id = Number(eventId);
  const addToast = useToastStore((state) => state.addToast);
  const { tickets, heldTickets, summary, loading, error, refetch } = useMyTickets(id);
  const mine = useMySchedule(id);
  const [params, setParams] = useSearchParams();
  // Default to your own schedule when you hold a ticket; else the ones you own.
  const requested = params.get('view');
  const view: 'schedule' | 'owned' =
    requested === 'owned' || requested === 'schedule'
      ? requested
      : mine.schedule && !mine.schedule.ticket && summary.total_owned > 0 && heldTickets.length === 0
        ? 'owned'
        : 'schedule';
  const selectView = (next: 'schedule' | 'owned') => {
    const updated = new URLSearchParams(params);
    updated.set('view', next);
    setParams(updated, { replace: true });
  };
  const [event, setEvent] = useState<BigEvent | null>(null);
  const [assignTicket, setAssignTicket] = useState<EventTicket | null>(null);
  const [transferTicket, setTransferTicket] = useState<EventTicket | null>(null);
  const [handOverTicket, setHandOverTicket] = useState<HeldTicket | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    void eventService.get(id).then(setEvent).catch(() => setEvent(null));
  }, [id]);

  const handleAssign = async (payload: AssignHolderPayload) => {
    if (!assignTicket) return;
    setBusy(true);
    try {
      await orderService.assignTicket(assignTicket.id, payload);
      addToast({ type: 'success', message: 'Holder assigned.' });
      setAssignTicket(null);
      await refetch();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Assign failed' });
    } finally {
      setBusy(false);
    }
  };

  const handleTransfer = async (payload: TransferPayload) => {
    if (!transferTicket) return;
    setBusy(true);
    try {
      await orderService.transferTicket(transferTicket.id, payload);
      addToast({ type: 'success', message: 'Ticket transferred.' });
      setTransferTicket(null);
      await refetch();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Transfer failed' });
    } finally {
      setBusy(false);
    }
  };

  const handleHandOver = async (payload: HandOverPayload) => {
    if (!handOverTicket) return;
    setBusy(true);
    try {
      await orderService.handOverTicket(handOverTicket.id, payload);
      addToast({
        type: 'success',
        message: `Ticket handed over to ${payload.first_name} ${payload.last_name}. They've been emailed it.`,
      });
      setHandOverTicket(null);
      await Promise.all([refetch(), mine.refetch()]);
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Hand-over failed' });
    } finally {
      setBusy(false);
    }
  };

  if (!Number.isFinite(id)) {
    return <Text variant="muted">Invalid event.</Text>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h1">
          {event?.name || 'My tickets'}
        </Heading>
        <Text variant="muted">
          {view === 'schedule'
            ? 'Your sessions, attendance and reviews'
            : 'Tickets you own — assign holders or transfer to your team'}
        </Text>
      </div>
      <EventSubnav eventId={id} />

      <div
        role="tablist"
        aria-label="My tickets view"
        className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/5"
      >
        {(
          [
            ['schedule', 'My schedule'],
            ['owned', `Tickets I own${summary.total_owned ? ` (${summary.total_owned})` : ''}`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={view === key}
            onClick={() => selectView(key)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              view === key
                ? 'bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-white'
                : 'text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'schedule' ? (
        <HeldTicketsSection tickets={heldTickets} onHandOver={setHandOverTicket} />
      ) : null}

      {view === 'schedule' ? (
        mine.loading && !mine.schedule ? (
          <LoadingState />
        ) : mine.error ? (
          <ErrorState description={mine.error} onRetry={() => void mine.refetch()} />
        ) : mine.schedule?.ticket ? (
          <MySchedulePanel
            schedule={mine.schedule}
            onReviewEvent={async (input) => {
              await mine.reviewEvent(input);
              addToast({ type: 'success', message: 'Thanks — your review of the event is saved.' });
            }}
            onReviewSession={async (sessionId, input) => {
              await mine.reviewSession(sessionId, input);
              addToast({ type: 'success', message: 'Thanks — your review is saved.' });
            }}
          />
        ) : heldTickets.length > 0 ? null : (
          <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-white/15">
            <p className="font-medium text-slate-900 dark:text-white">You don’t hold a ticket for this event</p>
            <Text variant="muted" className="mx-auto mt-1 max-w-md text-sm">
              Your schedule appears once a ticket is assigned to your email. If someone bought one for
              you, ask them to assign it to you.
            </Text>
            {summary.total_owned > 0 ? (
              <Button type="button" variant="outline" className="mt-4" onClick={() => selectView('owned')}>
                See tickets you own
              </Button>
            ) : null}
          </div>
        )
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {(
              [
                ['Owned', summary.total_owned],
                ['Assigned', summary.assigned],
                ['Unassigned', summary.unassigned],
                ['Transferred', summary.transferred],
                ['Checked in', summary.checked_in],
              ] as const
            ).map(([label, value]) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <Text variant="muted" className="text-xs uppercase tracking-wide">
                    {label}
                  </Text>
                  <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState description={error} onRetry={() => void refetch()} />
          ) : (
            <MyTicketsTable
              tickets={tickets}
              onAssign={setAssignTicket}
              onTransfer={setTransferTicket}
              onPdf={(ticket) =>
                void orderService.openTicketPdf(ticket.id).catch((err: unknown) =>
                  addToast({
                    type: 'error',
                    message: err instanceof Error ? err.message : 'PDF failed',
                  }),
                )
              }
            />
          )}
        </>
      )}

      <AssignTicketModal
        open={Boolean(assignTicket)}
        ticket={assignTicket}
        submitting={busy}
        onClose={() => setAssignTicket(null)}
        onSubmit={handleAssign}
      />
      <TransferTicketModal
        open={Boolean(transferTicket)}
        ticket={transferTicket}
        submitting={busy}
        onClose={() => setTransferTicket(null)}
        onSubmit={handleTransfer}
      />
      <HandOverTicketModal
        open={Boolean(handOverTicket)}
        ticket={handOverTicket}
        eventId={id}
        mode="self"
        submitting={busy}
        onClose={() => setHandOverTicket(null)}
        onSubmit={handleHandOver}
      />
    </div>
  );
}
