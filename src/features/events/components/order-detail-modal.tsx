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

interface OrderDetailModalProps {
  open: boolean;
  order: EventOrder | null;
  loading: boolean;
  onClose: () => void;
  onAssign: (ticket: EventTicket) => void;
  onTransfer: (ticket: EventTicket) => void;
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
};

function holderLabel(ticket: EventTicket): string {
  const name = `${ticket.holder_first_name} ${ticket.holder_last_name}`.trim();
  return name || ticket.holder_email || 'Unassigned';
}

/** Order detail + per-ticket actions + edit / refund / cancel / re-email / PDF. */
export function OrderDetailModal({
  open,
  order,
  loading,
  onClose,
  onAssign,
  onTransfer,
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
              <Badge variant={STATUS_VARIANT[order.status]}>{order.status}</Badge>
              <Badge variant="outline">{order.transaction_type}</Badge>
              <Badge variant="secondary">{order.source}</Badge>
              <Text variant="muted" className="text-sm">
                {formatPrice(order.total, order.currency)} · {order.quantity} ticket
                {order.quantity === 1 ? '' : 's'}
              </Text>
            </div>

            {editing ? (
              <Form onSubmit={saveEdit}>
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
              <div className="grid gap-1 text-sm text-slate-700 dark:text-white/80">
                <div>
                  {order.purchaser_first_name} {order.purchaser_last_name} ·{' '}
                  {order.purchaser_email}
                </div>
                <div>Seller: {order.attributed_seller_name ?? 'Unassigned'}</div>
                {order.promo_code ? <div>Promo: {order.promo_code}</div> : null}
                {order.notes ? <div>Notes: {order.notes}</div> : null}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void runResend()}>
                Re-email
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
              <Text className="mb-2 font-medium">Tickets</Text>
              {order.tickets.length === 0 ? (
                <Text variant="muted" className="text-sm">
                  Tickets are issued after payment confirms.
                </Text>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-white/10">
                  {order.tickets.map((ticket) => (
                    <li
                      key={ticket.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                    >
                      <div>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {ticket.ticket_number}
                        </span>
                        <span className="ml-2 text-slate-500 dark:text-white/50">
                          {ticket.assignment_status} · {holderLabel(ticket)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
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
                          onClick={() => onTransfer(ticket)}
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
                          PDF
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
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
