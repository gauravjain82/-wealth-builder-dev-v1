import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Badge,
  Button,
  ConfirmationDialog,
  Form,
  FormActions,
  FormRow,
  FormRowGroup,
  Input,
  Label,
  Modal,
  Select,
  Text,
  Textarea,
} from '@shared/components';
import { useToastStore } from '@/store';
import { formatPrice } from '../utils/public-pricing';
import { configService } from '../services/config-service';
import { orderService } from '../services/order-service';
import type { EventOrder, OrderStatus, OrderUpdatePayload } from '../types/order';
import type { EventTicket } from '../types/ticket';
import type { EventTrackedSeller } from '../types/config';
import {
  ORDER_STATUS_LABEL,
  TICKET_STATUS_LABEL,
  TICKET_STATUS_TONE,
  isPartnerTicket,
  shownStatus,
} from '../utils/ticket-status';
import { TicketCountPills } from './ticket-count-pills';

interface OrderDetailModalProps {
  open: boolean;
  order: EventOrder | null;
  loading: boolean;
  onClose: () => void;
  onAssign: (ticket: EventTicket) => void;
  onTransfer: (ticket: EventTicket) => void;
  /**
   * Transfer by hand-over (same ticket and QR, new named attendee, who is emailed).
   * The "Transfer" button uses it for BSCPro tickets; WB tickets use `onTransfer`.
   */
  onHandOver?: (ticket: EventTicket) => void;
  onUpdated: () => void;
  onRefund: (orderId: number) => Promise<unknown>;
  onCancel: (orderId: number) => Promise<unknown>;
  onResend: (orderId: number) => Promise<unknown>;
}

type BadgeVariant = 'secondary' | 'success' | 'outline' | 'warning' | 'info';

const STATUS_VARIANT: Record<OrderStatus, BadgeVariant> = {
  PENDING: 'warning',
  PAID: 'success',
  REFUNDED: 'outline',
  CANCELLED: 'secondary',
  COMP: 'info',
  EXTERNAL: 'outline',
};

function attendeeName(ticket: EventTicket): string {
  return `${ticket.holder_first_name} ${ticket.holder_last_name}`.trim() || ticket.holder_email;
}

/** The order's ticket counts, by shown status. */
function TicketCounts({ tickets }: { tickets: EventTicket[] }) {
  const count = (status: string) => tickets.filter((t) => shownStatus(t) === status).length;
  return (
    <TicketCountPills
      total={tickets.length}
      assigned={count('ASSIGNED')}
      unassigned={count('UNASSIGNED')}
      transferred={count('TRANSFERRED')}
    />
  );
}

/** One labelled line of the order summary; hidden when there is no value. */
function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="w-36 shrink-0 text-slate-500 dark:text-white/50">{label}</span>
      <span className="text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

/** Order detail + per-ticket actions + edit / refund / cancel / re-email / PDF. */
export function OrderDetailModal({
  open,
  order,
  loading,
  onClose,
  onAssign,
  onTransfer,
  onHandOver,
  onUpdated,
  onRefund,
  onCancel,
  onResend,
}: OrderDetailModalProps) {
  const addToast = useToastStore((state) => state.addToast);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sellers, setSellers] = useState<EventTrackedSeller[]>([]);
  const [confirm, setConfirm] = useState<'refund' | 'cancel' | null>(null);
  /** The ticket whose details are open below its row (one at a time). */
  const [openTicketId, setOpenTicketId] = useState<number | null>(null);
  const [form, setForm] = useState({
    purchaser_first_name: '',
    purchaser_last_name: '',
    purchaser_email: '',
    purchaser_phone: '',
    attributed_seller: '',
    notes: '',
  });

  useEffect(() => {
    if (!open || !order) return;
    setEditing(false);
    setConfirm(null);
    // A one-ticket order opens with that ticket's details showing.
    setOpenTicketId(order.tickets.length === 1 ? order.tickets[0].id : null);
    setForm({
      purchaser_first_name: order.purchaser_first_name,
      purchaser_last_name: order.purchaser_last_name,
      purchaser_email: order.purchaser_email,
      purchaser_phone: order.purchaser_phone,
      attributed_seller: order.attributed_seller ? String(order.attributed_seller) : '',
      notes: order.notes,
    });
    void configService.listSellers(order.event).then(setSellers).catch(() => setSellers([]));
  }, [open, order]);

  if (!open) return null;

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!order) return;
    setSaving(true);
    try {
      const payload: OrderUpdatePayload = {
        purchaser_first_name: form.purchaser_first_name,
        purchaser_last_name: form.purchaser_last_name,
        purchaser_email: form.purchaser_email,
        purchaser_phone: form.purchaser_phone,
        attributed_seller: form.attributed_seller ? Number(form.attributed_seller) : null,
        notes: form.notes,
      };
      await orderService.updateOrder(order.id, payload);
      addToast({ type: 'success', message: 'Order updated.' });
      setEditing(false);
      onUpdated();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Update failed' });
    } finally {
      setSaving(false);
    }
  };

  const runResend = async () => {
    if (!order) return;
    try {
      await onResend(order.id);
      addToast({ type: 'success', message: 'Confirmation email queued.' });
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Resend failed' });
    }
  };

  const runPdf = async () => {
    if (!order) return;
    try {
      await orderService.openOrderPdf(order.id);
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'PDF failed' });
    }
  };

  const imported = order?.source === 'EXTERNAL';

  /** The row's second line: our ticket number and, for an imported ticket, its partner confirmation. */
  const ticketLine = (ticket: EventTicket): string =>
    [
      ticket.ticket_number,
      isPartnerTicket(ticket) && ticket.external_reference ? `BSCPro ${ticket.external_reference}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
  const canRefund = order?.status === 'PAID' || order?.status === 'COMP';
  const canCancel = order?.status === 'PENDING';

  return (
    <>
      <Modal
        open={open}
        title={order ? order.invoice_number : 'Order'}
        onClose={onClose}
        contentClassName="max-w-2xl"
      >
        {loading || !order ? (
          <Text variant="muted">Loading…</Text>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {imported ? (
                <Badge variant="outline">Sold by {order.channel ?? 'partner'}</Badge>
              ) : (
                <>
                  <Badge variant={STATUS_VARIANT[order.status]}>
                    {ORDER_STATUS_LABEL[order.status] ?? order.status}
                  </Badge>
                  <Badge variant="outline">{order.transaction_type}</Badge>
                </>
              )}
              {imported ? null : (
                <Text variant="muted" className="text-sm">
                  {formatPrice(order.total, order.currency)}
                </Text>
              )}
              <TicketCounts tickets={order.tickets} />
            </div>

            {editing ? (
              <Form onSubmit={saveEdit}>
                <Text variant="muted" className="text-sm">
                  You are editing the <strong>invoice details</strong> — purchaser, SMD credited and
                  notes. Tickets are not changed here; use <strong>Assign</strong> or{' '}
                  <strong>Transfer</strong> on a ticket to change who attends.
                </Text>
                <FormRowGroup columns={2}>
                  <FormRow>
                    <Label variant="form">First name</Label>
                    <Input
                      value={form.purchaser_first_name}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, purchaser_first_name: e.target.value }))
                      }
                    />
                  </FormRow>
                  <FormRow>
                    <Label variant="form">Last name</Label>
                    <Input
                      value={form.purchaser_last_name}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, purchaser_last_name: e.target.value }))
                      }
                    />
                  </FormRow>
                  <FormRow>
                    <Label variant="form">Email</Label>
                    <Input
                      type="email"
                      value={form.purchaser_email}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, purchaser_email: e.target.value }))
                      }
                    />
                  </FormRow>
                  <FormRow>
                    <Label variant="form">Phone</Label>
                    <Input
                      value={form.purchaser_phone}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, purchaser_phone: e.target.value }))
                      }
                    />
                  </FormRow>
                  <FormRow>
                    <Label variant="form">Attributed seller</Label>
                    <Select
                      value={form.attributed_seller}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, attributed_seller: e.target.value }))
                      }
                    >
                      <option value="">Unassigned</option>
                      {sellers.map((seller) => (
                        <option key={seller.id} value={seller.id}>
                          {seller.display_name}
                          {seller.team_name ? ` · ${seller.team_name}` : ''}
                        </option>
                      ))}
                    </Select>
                  </FormRow>
                </FormRowGroup>
                <FormRow>
                  <Label variant="form">Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </FormRow>
                <FormActions>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </FormActions>
              </Form>
            ) : (
              <div className="grid gap-1 rounded-lg border border-slate-200 p-3 text-sm dark:border-white/10">
                <Fact
                  label="Purchaser name"
                  value={`${order.purchaser_first_name} ${order.purchaser_last_name}`.trim() || '—'}
                />
                <Fact label="Purchaser email" value={order.purchaser_email || '—'} />
                <Fact label="Purchaser phone" value={order.purchaser_phone || '—'} />
                <Fact label="Sold by" value={order.channel ?? (imported ? 'Partner' : 'WB')} />
                {imported ? (
                  <>
                    <Fact label={`${order.channel ?? 'Partner'} purchase`} value={order.external_order_reference || '—'} />
                    <Fact label={`${order.channel ?? 'Partner'} invoice`} value={order.external_invoice_reference || '—'} />
                  </>
                ) : null}
                {order.external_payment ? (
                  // Paid at the partner, from its transactions export. Reference only:
                  // the charge is the partner's, so there is nothing here WB can refund.
                  <>
                    <Fact label="Paid by" value={order.external_payment.payment_method || '—'} />
                    <Fact
                      label="Ticket price"
                      value={`${order.external_payment.quantity} × ${formatPrice(order.external_payment.unit_price, order.external_payment.currency)}`}
                    />
                    <Fact
                      label="Total paid"
                      value={formatPrice(order.external_payment.total, order.external_payment.currency)}
                    />
                    <Fact
                      label="Paid on"
                      value={order.external_payment.paid_at ? new Date(order.external_payment.paid_at).toLocaleString() : '—'}
                    />
                    <Fact
                      label={`${order.channel ?? 'Partner'} charge`}
                      value={order.external_payment.processor_transaction_id || '—'}
                    />
                  </>
                ) : imported ? (
                  <Fact label="Paid by" value={`No payment data from ${order.channel ?? 'the partner'} yet`} />
                ) : null}
                <Fact label="SMD" value={order.attributed_seller_name ?? 'None credited'} />
                <Fact label="Promo" value={order.promo_code} />
                <Fact label="Notes" value={order.notes} />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                title="Change the purchaser's details, the SMD credited and the notes — not the tickets"
                onClick={() => setEditing(true)}
              >
                Edit invoice details
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                title="Sends the invoice confirmation, with a QR card for every ticket, to the purchaser"
                onClick={() => void runResend()}
              >
                Email invoice to purchaser
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void runPdf()}>
                Print / PDF
              </Button>
              {canCancel ? (
                <Button type="button" variant="destructive" size="sm" onClick={() => setConfirm('cancel')}>
                  Cancel
                </Button>
              ) : null}
              {canRefund ? (
                <Button type="button" variant="destructive" size="sm" onClick={() => setConfirm('refund')}>
                  Refund
                </Button>
              ) : null}
            </div>

            <div>
              <Text className="mb-1 font-medium">Tickets</Text>
              {order.tickets.length > 1 ? (
                <Text variant="muted" className="mb-2 text-xs">
                  Click a ticket to see its details and actions.
                </Text>
              ) : null}
              {order.tickets.length === 0 ? (
                <Text variant="muted" className="text-sm">
                  Tickets are issued after payment confirms.
                </Text>
              ) : (
                <>
                <ul className="divide-y divide-slate-100 dark:divide-white/10">
                  {order.tickets.map((ticket) => (
                    <li key={ticket.id} className="py-1 text-sm">
                      <button
                        type="button"
                        className="flex w-full items-start justify-between gap-3 rounded-md px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-white/5"
                        aria-expanded={openTicketId === ticket.id}
                        onClick={() =>
                          setOpenTicketId((current) => (current === ticket.id ? null : ticket.id))
                        }
                      >
                        <span className="flex items-start gap-2">
                          <span aria-hidden className="mt-0.5 text-slate-400 dark:text-white/40">
                            {openTicketId === ticket.id ? '▾' : '▸'}
                          </span>
                          <span>
                            <span
                              className={
                                attendeeName(ticket)
                                  ? 'font-medium text-slate-900 dark:text-white'
                                  : 'italic text-slate-500 dark:text-white/50'
                              }
                            >
                              {attendeeName(ticket) || 'Not assigned'}
                            </span>
                            <span className="block text-xs text-slate-500 dark:text-white/50">
                              {ticketLine(ticket)}
                            </span>
                          </span>
                        </span>
                        <Badge
                          variant={TICKET_STATUS_TONE[shownStatus(ticket)]}
                          className="shrink-0 px-3 py-1 text-sm shadow-sm"
                        >
                          {TICKET_STATUS_LABEL[shownStatus(ticket)]}
                        </Badge>
                      </button>
                      {openTicketId === ticket.id ? (
                        <div className="mx-2 mb-2 mt-1 space-y-3 rounded-lg border border-slate-200 p-3 dark:border-white/10">
                          <div className="grid gap-1">
                            <Fact label="Attendee name" value={`${ticket.holder_first_name} ${ticket.holder_last_name}`.trim() || 'Not assigned'} />
                            <Fact label="Attendee email" value={ticket.holder_email || '—'} />
                            <Fact label="Attendee phone" value={ticket.holder_phone || '—'} />
                            <Fact label="Ticket number" value={ticket.ticket_number} />
                            {isPartnerTicket(ticket) ? (
                              <Fact
                                label="BSCPro confirmation"
                                value={ticket.external_reference || '—'}
                              />
                            ) : null}
                            <Fact label="Status" value={TICKET_STATUS_LABEL[shownStatus(ticket)]} />
                            <Fact label="SMD" value={ticket.attributed_seller_name || 'None credited'} />
                            <Fact label="WB account" value={ticket.holder_user ? 'Linked' : 'Not linked'} />
                            <Fact label="Checked in" value={ticket.is_checked_in ? 'Yes' : 'No'} />
                            {ticket.transfer_count > 0 ? (
                              <Fact
                                label="Transfers"
                                value={`${ticket.transfer_count} time${ticket.transfer_count === 1 ? '' : 's'}`}
                              />
                            ) : null}
                          </div>
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onAssign(ticket)}
                            >
                              Assign
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              // A BSCPro ticket keeps its confirmation and QR, so it
                              // changes hands by naming the new attendee (hand-over);
                              // a WB ticket's ownership moves (transfer).
                              onClick={() =>
                                isPartnerTicket(ticket) && onHandOver
                                  ? onHandOver(ticket)
                                  : onTransfer(ticket)
                              }
                              disabled={ticket.lifecycle_status !== 'ACTIVE'}
                            >
                              Transfer
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                void orderService.openTicketPdf(ticket.id).catch((err: unknown) =>
                                  addToast({
                                    type: 'error',
                                    message: err instanceof Error ? err.message : 'PDF failed',
                                  }),
                                )
                              }
                            >
                              Ticket PDF
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 space-y-0.5 text-xs italic text-slate-500 dark:text-white/50">
                  <p>
                    * <strong>Assign</strong> — name or correct who attends; no email is sent.
                  </p>
                  <p>
                    * <strong>Transfer</strong> — give the ticket to someone else; they are emailed it
                    {imported ? ' (the ticket, QR and BSCPro confirmation stay the same)' : ''}.
                  </p>
                  <p>
                    * <strong>Edit invoice details</strong> and <strong>Email invoice to purchaser</strong>{' '}
                    act on the invoice, not a single ticket — the email goes to the purchaser with a QR
                    card for every ticket.
                  </p>
                </div>
                </>
              )}
            </div>

            {order.add_on_items.length > 0 ? (
              <div>
                <Text className="mb-2 font-medium">Add-ons</Text>
                <ul className="text-sm text-slate-700 dark:text-white/80">
                  {order.add_on_items.map((item) => (
                    <li key={item.id}>
                      {item.product_name} × {item.quantity} ·{' '}
                      {formatPrice(item.total, order.currency)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </Modal>

      <ConfirmationDialog
        open={confirm === 'refund'}
        title="Refund this order?"
        message="This refunds the payment (Stripe if applicable) and marks every ticket refunded."
        confirmText="Refund"
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          if (!order) return;
          try {
            await onRefund(order.id);
            addToast({ type: 'success', message: 'Order refunded.' });
            setConfirm(null);
            onClose();
          } catch (err) {
            addToast({
              type: 'error',
              message: err instanceof Error ? err.message : 'Refund failed',
            });
          }
        }}
      />
      <ConfirmationDialog
        open={confirm === 'cancel'}
        title="Cancel this pending order?"
        message="No refund is issued. Use refund for settled orders."
        confirmText="Cancel order"
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          if (!order) return;
          try {
            await onCancel(order.id);
            addToast({ type: 'success', message: 'Order cancelled.' });
            setConfirm(null);
            onClose();
          } catch (err) {
            addToast({
              type: 'error',
              message: err instanceof Error ? err.message : 'Cancel failed',
            });
          }
        }}
      />
    </>
  );
}
