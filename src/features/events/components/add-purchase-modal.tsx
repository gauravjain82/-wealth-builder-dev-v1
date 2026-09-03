import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Button,
  Form,
  FormActions,
  FormRow,
  FormRowGroup,
  Input,
  Label,
  Modal,
  Select,
  Textarea,
} from '@shared/components';
import { useToastStore } from '@/store';
import { configService } from '../services/config-service';
import type { EventAddOn, EventTrackedSeller } from '../types/config';
import type { OrderCreatePayload, TransactionType } from '../types/order';

interface AddPurchaseModalProps {
  open: boolean;
  eventId: number;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: OrderCreatePayload) => Promise<void>;
}

const OFFLINE_TYPES: { value: TransactionType; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CHECK', label: 'Check' },
  { value: 'CREDIT', label: 'Credit' },
  { value: 'COMP', label: 'Complimentary' },
];

const EMPTY = {
  transaction_type: 'CASH' as TransactionType,
  quantity: '1',
  purchaser_first_name: '',
  purchaser_last_name: '',
  purchaser_email: '',
  purchaser_phone: '',
  promo_code: '',
  attributed_seller_id: '',
  notes: '',
};

/**
 * Admin "Add Purchase" for offline payments (cash/check/credit/comp).
 * Stripe guest checkout stays on the public page — this records a settled order.
 */
export function AddPurchaseModal({
  open,
  eventId,
  submitting,
  onClose,
  onSubmit,
}: AddPurchaseModalProps) {
  const addToast = useToastStore((state) => state.addToast);
  const [form, setForm] = useState(EMPTY);
  const [sellers, setSellers] = useState<EventTrackedSeller[]>([]);
  const [addOns, setAddOns] = useState<EventAddOn[]>([]);
  const [addOnQty, setAddOnQty] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY);
    setAddOnQty({});
    void Promise.all([
      configService.listSellers(eventId),
      configService.listAddOns(eventId),
    ])
      .then(([sellerRows, addOnRows]) => {
        setSellers(sellerRows);
        setAddOns(addOnRows);
      })
      .catch((err: unknown) => {
        addToast({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to load sellers',
        });
      });
  }, [open, eventId, addToast]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantity = Number(form.quantity);
    if (!form.purchaser_email.trim() || !Number.isFinite(quantity) || quantity < 1) {
      addToast({ type: 'error', message: 'Email and a quantity of at least 1 are required.' });
      return;
    }
    const add_ons = Object.entries(addOnQty)
      .map(([id, qty]) => ({ add_on_id: Number(id), quantity: Number(qty) }))
      .filter((row) => Number.isFinite(row.quantity) && row.quantity > 0);
    await onSubmit({
      transaction_type: form.transaction_type,
      quantity,
      purchaser_first_name: form.purchaser_first_name.trim(),
      purchaser_last_name: form.purchaser_last_name.trim(),
      purchaser_email: form.purchaser_email.trim(),
      purchaser_phone: form.purchaser_phone.trim() || undefined,
      promo_code: form.promo_code.trim() || undefined,
      attributed_seller_id: form.attributed_seller_id
        ? Number(form.attributed_seller_id)
        : undefined,
      notes: form.notes.trim() || undefined,
      add_ons: add_ons.length ? add_ons : undefined,
    });
  };

  return (
    <Modal open={open} title="Add Purchase" onClose={onClose} contentClassName="max-w-lg">
      <Form onSubmit={handleSubmit}>
        <FormRowGroup columns={2}>
          <FormRow>
            <Label variant="form">Payment type</Label>
            <Select
              value={form.transaction_type}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, transaction_type: e.target.value as TransactionType }))
              }
            >
              {OFFLINE_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </FormRow>
          <FormRow>
            <Label variant="form">Quantity</Label>
            <Input
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
            />
          </FormRow>
          <FormRow>
            <Label variant="form">First name</Label>
            <Input
              value={form.purchaser_first_name}
              onChange={(e) => setForm((prev) => ({ ...prev, purchaser_first_name: e.target.value }))}
            />
          </FormRow>
          <FormRow>
            <Label variant="form">Last name</Label>
            <Input
              value={form.purchaser_last_name}
              onChange={(e) => setForm((prev) => ({ ...prev, purchaser_last_name: e.target.value }))}
            />
          </FormRow>
          <FormRow>
            <Label variant="form">Email</Label>
            <Input
              type="email"
              required
              value={form.purchaser_email}
              onChange={(e) => setForm((prev) => ({ ...prev, purchaser_email: e.target.value }))}
            />
          </FormRow>
          <FormRow>
            <Label variant="form">Phone</Label>
            <Input
              value={form.purchaser_phone}
              onChange={(e) => setForm((prev) => ({ ...prev, purchaser_phone: e.target.value }))}
            />
          </FormRow>
          <FormRow>
            <Label variant="form">Attributed seller</Label>
            <Select
              value={form.attributed_seller_id}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, attributed_seller_id: e.target.value }))
              }
            >
              <option value="">Unassigned</option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.display_name} ({seller.agent_code})
                </option>
              ))}
            </Select>
          </FormRow>
          <FormRow>
            <Label variant="form">Promo code</Label>
            <Input
              value={form.promo_code}
              onChange={(e) => setForm((prev) => ({ ...prev, promo_code: e.target.value }))}
            />
          </FormRow>
        </FormRowGroup>
        {addOns.length > 0 ? (
          <div className="space-y-2">
            <Label variant="form">Add-ons</Label>
            {addOns.map((addOn) => (
              <div key={addOn.id} className="flex items-center gap-3">
                <span className="flex-1 text-sm text-slate-700 dark:text-white/80">
                  {addOn.product_name} · {addOn.unit_price}
                </span>
                <Input
                  type="number"
                  min={0}
                  className="w-20"
                  value={addOnQty[addOn.id] ?? ''}
                  onChange={(e) =>
                    setAddOnQty((prev) => ({ ...prev, [addOn.id]: e.target.value }))
                  }
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        ) : null}
        <FormRow>
          <Label variant="form">Notes</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </FormRow>
        <FormActions>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Record purchase'}
          </Button>
        </FormActions>
      </Form>
    </Modal>
  );
}
