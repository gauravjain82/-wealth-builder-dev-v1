import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, ErrorState, Heading, LoadingState, Text } from '@shared/components';
import { useToastStore } from '@/store';
import { useMyTickets } from '../hooks/use-my-tickets';
import { eventService } from '../services/event-service';
import { orderService } from '../services/order-service';
import { EventSubnav } from '../components/event-subnav';
import { MyTicketsTable } from '../components/my-tickets-table';
import { AssignTicketModal } from '../components/assign-ticket-modal';
import { TransferTicketModal } from '../components/transfer-ticket-modal';
import type { AssignHolderPayload, EventTicket, TransferPayload } from '../types/ticket';
import type { BigEvent } from '../types/event';

export default function EventMyTicketsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const id = Number(eventId);
  const addToast = useToastStore((state) => state.addToast);
  const { tickets, summary, loading, error, refetch } = useMyTickets(id);
  const [event, setEvent] = useState<BigEvent | null>(null);
  const [assignTicket, setAssignTicket] = useState<EventTicket | null>(null);
  const [transferTicket, setTransferTicket] = useState<EventTicket | null>(null);
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

  if (!Number.isFinite(id)) {
    return <Text variant="muted">Invalid event.</Text>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h1">
          {event?.name || 'My tickets'}
        </Heading>
        <Text variant="muted">Tickets you own — assign holders or transfer to your team</Text>
      </div>
      <EventSubnav eventId={id} />

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
    </div>
  );
}
