import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Button,
  ErrorState,
  Heading,
  Input,
  LoadingState,
  Select,
  Text,
} from '@shared/components';
import { useToastStore } from '@/store';
import { eventService } from '../services/event-service';
import { orderService } from '../services/order-service';
import { configService } from '../services/config-service';
import { useEventOrders } from '../hooks/use-event-orders';
import { EventSubnav } from '../components/event-subnav';
import { StatsCards } from '../components/stats-cards';
import { OrderTable } from '../components/order-table';
import { AddPurchaseModal } from '../components/add-purchase-modal';
import { OrderDetailModal } from '../components/order-detail-modal';
import { AssignTicketModal } from '../components/assign-ticket-modal';
import { TransferTicketModal } from '../components/transfer-ticket-modal';
import { ReportsPanel } from '../components/reports-panel';
import type { BigEvent } from '../types/event';
import type { EventOrder, EventOrderListItem, OrderCreatePayload } from '../types/order';
import type { AssignHolderPayload, EventTicket, TransferPayload } from '../types/ticket';
import type { EventTrackedSeller } from '../types/config';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'COMP', label: 'Comp' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'STRIPE', label: 'Stripe' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHECK', label: 'Check' },
  { value: 'CREDIT', label: 'Credit' },
  { value: 'COMP', label: 'Comp' },
];

export default function EventOrdersPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const id = Number(eventId);
  const addToast = useToastStore((state) => state.addToast);
  const {
    orders,
    summary,
    loading,
    error,
    filters,
    setFilters,
    refetch,
    createOrder,
    refundOrder,
    cancelOrder,
    resendConfirmation,
    resendFiltered,
  } = useEventOrders(id);

  const [event, setEvent] = useState<BigEvent | null>(null);
  const [sellers, setSellers] = useState<EventTrackedSeller[]>([]);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<EventOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [assignTicket, setAssignTicket] = useState<EventTicket | null>(null);
  const [transferTicket, setTransferTicket] = useState<EventTicket | null>(null);
  const [ticketBusy, setTicketBusy] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    void eventService.get(id).then(setEvent).catch(() => setEvent(null));
    void configService.listSellers(id).then(setSellers).catch(() => setSellers([]));
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => setFilters({ search: search || undefined }), 300);
    return () => clearTimeout(timer);
  }, [search, setFilters]);

  const openDetail = async (row: EventOrderListItem) => {
    setDetailLoading(true);
    try {
      setDetail(await orderService.getOrder(row.id));
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load order' });
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async () => {
    if (!detail) return;
    setDetail(await orderService.getOrder(detail.id));
    await refetch();
  };

  const handleAdd = async (payload: OrderCreatePayload) => {
    setAdding(true);
    try {
      const created = await createOrder(payload);
      addToast({ type: 'success', message: `Recorded ${created.invoice_number}.` });
      setAddOpen(false);
      setDetail(created);
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to record purchase',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleAssign = async (payload: AssignHolderPayload) => {
    if (!assignTicket) return;
    setTicketBusy(true);
    try {
      await orderService.assignTicket(assignTicket.id, payload);
      addToast({ type: 'success', message: 'Holder assigned.' });
      setAssignTicket(null);
      await refreshDetail();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Assign failed' });
    } finally {
      setTicketBusy(false);
    }
  };

  const handleTransfer = async (payload: TransferPayload) => {
    if (!transferTicket) return;
    setTicketBusy(true);
    try {
      await orderService.transferTicket(transferTicket.id, payload);
      addToast({ type: 'success', message: 'Ticket transferred.' });
      setTransferTicket(null);
      await refreshDetail();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Transfer failed' });
    } finally {
      setTicketBusy(false);
    }
  };

  const handleResendFiltered = async () => {
    try {
      const queued = await resendFiltered();
      addToast({ type: 'success', message: `Queued ${queued} confirmation email${queued === 1 ? '' : 's'}.` });
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Resend failed' });
    }
  };

  const onFilterUnassigned = useCallback(() => {
    setFilters({ unassigned_seller: true, status: undefined, attributed_seller: undefined });
  }, [setFilters]);

  if (!Number.isFinite(id)) {
    return <Text variant="muted">Invalid event.</Text>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h1">
          {event?.name || 'Purchases'}
        </Heading>
        <Text variant="muted">Orders, tickets, and reports</Text>
      </div>
      <EventSubnav eventId={id} />

      {summary ? <StatsCards summary={summary} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice, email, name…"
            className="max-w-xs"
          />
          <Select
            value={filters.status ?? ''}
            onChange={(e) => setFilters({ status: e.target.value || undefined })}
            className="max-w-[160px]"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <Select
            value={filters.transaction_type ?? ''}
            onChange={(e) => setFilters({ transaction_type: e.target.value || undefined })}
            className="max-w-[160px]"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <Select
            value={
              filters.unassigned_seller
                ? 'unassigned'
                : filters.attributed_seller
                  ? String(filters.attributed_seller)
                  : ''
            }
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'unassigned') {
                setFilters({ unassigned_seller: true, attributed_seller: undefined });
              } else {
                setFilters({
                  unassigned_seller: undefined,
                  attributed_seller: value ? Number(value) : undefined,
                });
              }
            }}
            className="max-w-[200px]"
          >
            <option value="">All sellers</option>
            <option value="unassigned">Unassigned SMD</option>
            {sellers.map((seller) => (
              <option key={seller.id} value={seller.id}>
                {seller.display_name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void handleResendFiltered()}>
            Resend filtered
          </Button>
          <Button type="button" onClick={() => setAddOpen(true)}>
            Add Purchase
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState description={error} onRetry={() => void refetch()} />
      ) : (
        <OrderTable
          orders={orders?.results ?? []}
          count={orders?.count ?? 0}
          page={filters.page ?? 1}
          onPageChange={(page) => setFilters({ page })}
          onOpen={(row) => void openDetail(row)}
        />
      )}

      <ReportsPanel
        eventId={id}
        currency={summary?.currency || event?.payment_currency || 'USD'}
        shortcut={event?.shortcut || 'event'}
        onFilterUnassigned={onFilterUnassigned}
        onFilterPending={() => setFilters({ status: 'PENDING', unassigned_seller: undefined })}
      />

      <AddPurchaseModal
        open={addOpen}
        eventId={id}
        submitting={adding}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAdd}
      />
      <OrderDetailModal
        open={Boolean(detail) || detailLoading}
        order={detail}
        loading={detailLoading}
        onClose={() => setDetail(null)}
        onAssign={setAssignTicket}
        onTransfer={setTransferTicket}
        onUpdated={() => void refreshDetail()}
        onRefund={refundOrder}
        onCancel={cancelOrder}
        onResend={resendConfirmation}
      />
      <AssignTicketModal
        open={Boolean(assignTicket)}
        ticket={assignTicket}
        submitting={ticketBusy}
        onClose={() => setAssignTicket(null)}
        onSubmit={handleAssign}
      />
      <TransferTicketModal
        open={Boolean(transferTicket)}
        ticket={transferTicket}
        submitting={ticketBusy}
        onClose={() => setTransferTicket(null)}
        onSubmit={handleTransfer}
      />
    </div>
  );
}
