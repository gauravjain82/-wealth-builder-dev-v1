import { Badge, Button } from '@shared/components';
import { formatPrice } from '../utils/public-pricing';
import type { EventOrderListItem, OrderStatus } from '../types/order';

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

function purchaserName(order: EventOrderListItem): string {
  const name = `${order.purchaser_first_name} ${order.purchaser_last_name}`.trim();
  return name || order.purchaser_email || '—';
}

/** How many attendee names to list in a row before "+N more". */
const ATTENDEES_SHOWN = 2;

/** The partner's references for an imported order: confirmation(s) and invoice number. */
function partnerReferences(order: EventOrderListItem): string {
  const parts: string[] = [];
  const confirmations = order.external_references ?? [];
  if (confirmations.length) parts.push(confirmations.join(', '));
  if (order.external_invoice_reference) parts.push(`Inv ${order.external_invoice_reference}`);
  return parts.join(' · ');
}

/** Attendee names with the assigned count; unnamed tickets read "Not named yet". */
function AttendeesCell({ order }: { order: EventOrderListItem }) {
  const names = (order.attendees ?? []).filter(Boolean);
  const unnamed = order.quantity - order.assigned_count;
  return (
    <div className="min-w-[140px]">
      {names.slice(0, ATTENDEES_SHOWN).map((name, index) => (
        <div key={`${name}-${index}`} className="text-slate-900 dark:text-white">
          {name}
        </div>
      ))}
      {names.length > ATTENDEES_SHOWN ? (
        <div className="text-xs text-slate-500 dark:text-white/50">
          +{names.length - ATTENDEES_SHOWN} more
        </div>
      ) : null}
      <div className="text-xs text-slate-500 dark:text-white/50">
        {order.assigned_count}/{order.quantity} assigned
        {unnamed > 0 && !names.length ? ' · not named yet' : ''}
      </div>
    </div>
  );
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

/** Clickable orders table; rows open the order-detail modal. */
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
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-white/60">
              <th className="px-3 py-2">Invoice</th>
              <th className="px-3 py-2">Purchaser</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Attendees</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Seller</th>
              <th className="px-3 py-2">When</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                onClick={() => onOpen(order)}
                className="cursor-pointer border-t border-slate-100 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
              >
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-900 dark:text-white">
                    {order.invoice_number}
                  </div>
                  {partnerReferences(order) ? (
                    <div className="text-xs text-slate-500 dark:text-white/50">
                      BSCPro {partnerReferences(order)}
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <div className="text-slate-900 dark:text-white">{purchaserName(order)}</div>
                  <div className="text-xs text-slate-500 dark:text-white/50">
                    {order.source === 'EXTERNAL' ? 'Sponsor (BSCPro)' : order.purchaser_email}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Badge variant={STATUS_VARIANT[order.status] ?? 'outline'}>{order.status}</Badge>
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-white/70">
                  {order.transaction_type}
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-white/70">{order.quantity}</td>
                <td className="px-3 py-2 text-slate-600 dark:text-white/70">
                  <AttendeesCell order={order} />
                </td>
                <td className="px-3 py-2 text-slate-900 dark:text-white">
                  {formatPrice(order.total, order.currency)}
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-white/70">
                  {order.attributed_seller_name ?? '—'}
                </td>
                <td className="px-3 py-2 text-slate-500 dark:text-white/50">
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
