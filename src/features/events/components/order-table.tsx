import { Badge, Button } from '@shared/components';
import { formatPrice } from '../utils/public-pricing';
import {
  ORDER_STATUS_LABEL,
  TICKET_STATUS_LABEL,
  TICKET_STATUS_TONE,
  statusCounts,
} from '../utils/ticket-status';
import type { EventOrderListItem, OrderStatus } from '../types/order';
import { SearchMatchLabel } from './search-match-label';
import { SEARCH_HIT_CLASS } from '../utils/purchase-search';

interface OrderTableProps {
  orders: EventOrderListItem[];
  onOpen: (order: EventOrderListItem) => void;
  page: number;
  count: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

type BadgeVariant = 'secondary' | 'success' | 'outline' | 'warning' | 'info' | 'destructive';

const STATUS_VARIANT: Record<OrderStatus, BadgeVariant> = {
  PENDING: 'warning',
  PAID: 'success',
  REFUNDED: 'outline',
  CANCELLED: 'secondary',
  COMP: 'info',
  EXTERNAL: 'outline',
};

/** How many attendees to list in a row before "+N more". */
const ATTENDEES_SHOWN = 3;

function isImported(order: EventOrderListItem): boolean {
  return order.source === 'EXTERNAL';
}

function purchaserName(order: EventOrderListItem): string {
  const name = `${order.purchaser_first_name} ${order.purchaser_last_name}`.trim();
  return name || order.purchaser_email || '—';
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Our invoice number, and for an import the partner's purchase and invoice numbers. */
function InvoiceCell({ order }: { order: EventOrderListItem }) {
  return (
    <div>
      <div className="font-medium text-slate-900 dark:text-white">{order.invoice_number}</div>
      {isImported(order) ? (
        <div className="text-xs text-slate-500 dark:text-white/50">
          {order.channel ?? 'Partner'} {order.external_order_reference || '—'}
          {order.external_invoice_reference ? ` · Inv ${order.external_invoice_reference}` : ''}
        </div>
      ) : null}
      <SearchMatchLabel matches={order.search_match} />
    </div>
  );
}

/**
 * Each ticket's attendee with its status; unnamed tickets read "Not assigned".
 * Attendees a search named come first and are highlighted, so they are never
 * hidden behind "+N more".
 */
function TicketsCell({ order }: { order: EventOrderListItem }) {
  const attendees = [...(order.attendees ?? [])].sort(
    (a, b) => Number(Boolean(b.matched)) - Number(Boolean(a.matched)),
  );
  return (
    <div className="min-w-[180px] space-y-0.5">
      {attendees.slice(0, ATTENDEES_SHOWN).map((attendee) => (
        <div key={attendee.ticket_number} className="flex items-center gap-1.5">
          <span
            className={`${
              attendee.name
                ? 'text-slate-900 dark:text-white'
                : 'italic text-slate-500 dark:text-white/50'
            } ${attendee.matched ? SEARCH_HIT_CLASS : ''}`}
          >
            {attendee.name || 'Not assigned'}
          </span>
          {attendee.status === 'TRANSFERRED' ? (
            <Badge variant={TICKET_STATUS_TONE.TRANSFERRED}>{TICKET_STATUS_LABEL.TRANSFERRED}</Badge>
          ) : null}
        </div>
      ))}
      {attendees.length > ATTENDEES_SHOWN ? (
        <div className="text-xs text-slate-500 dark:text-white/50">
          +{attendees.length - ATTENDEES_SHOWN} more
        </div>
      ) : null}
    </div>
  );
}

/** Imported orders: ticket status counts. WB orders: payment status, then the counts. */
function StatusCell({ order }: { order: EventOrderListItem }) {
  const counts = statusCounts(
    order.assigned_count,
    order.unassigned_count,
    order.transferred_count ?? 0,
  );
  return (
    <div className="space-y-1">
      {isImported(order) ? null : (
        <Badge variant={STATUS_VARIANT[order.status] ?? 'outline'}>
          {ORDER_STATUS_LABEL[order.status] ?? order.status}
        </Badge>
      )}
      <div className="text-xs text-slate-600 dark:text-white/70">{counts}</div>
    </div>
  );
}

/** Clickable purchases table; rows open the order-detail modal. */
export function OrderTable({
  orders,
  onOpen,
  page,
  count,
  pageSize = 25,
  onPageChange,
}: OrderTableProps) {
  const pageCount = Math.max(1, Math.ceil(count / pageSize));

  if (orders.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
        No orders match these filters.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
        <table className="w-full min-w-[1080px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-white/60">
              <th className="px-3 py-2">Invoice</th>
              <th className="px-3 py-2">Purchaser</th>
              <th className="px-3 py-2">Tickets</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Sold by</th>
              <th className="px-3 py-2">SMD</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">When</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                onClick={() => onOpen(order)}
                className="cursor-pointer border-t border-slate-100 align-top hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
              >
                <td className="px-3 py-2">
                  <InvoiceCell order={order} />
                </td>
                <td className="px-3 py-2">
                  <div className="text-slate-900 dark:text-white">
                    <span className={order.search_match?.includes('buyer') ? SEARCH_HIT_CLASS : undefined}>
                      {purchaserName(order)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-white/50">
                    {order.purchaser_email}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <TicketsCell order={order} />
                </td>
                <td className="px-3 py-2">
                  <StatusCell order={order} />
                </td>
                <td className="px-3 py-2 text-slate-900 dark:text-white">
                  {order.channel ?? (isImported(order) ? 'Partner' : 'WB')}
                  {isImported(order) ? null : (
                    <div className="text-xs text-slate-500 dark:text-white/50">
                      {order.transaction_type}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-white/70">
                  {order.attributed_seller_name ?? '—'}
                </td>
                <td className="px-3 py-2 text-slate-900 dark:text-white">
                  {isImported(order) ? (
                    <span
                      className="text-xs text-slate-500 dark:text-white/50"
                      title={`${order.channel ?? 'The partner'}'s export has no amounts`}
                    >
                      Not in export
                    </span>
                  ) : (
                    formatPrice(order.total, order.currency)
                  )}
                </td>
                <td className="px-3 py-2 text-slate-500 dark:text-white/50">
                  {isImported(order) ? 'Imported ' : ''}
                  {formatWhen(order.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-slate-500 dark:text-white/50">
            Page {page} of {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
