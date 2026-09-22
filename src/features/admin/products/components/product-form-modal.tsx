import { useEffect, useState } from 'react';
import { Button, Checkbox, Input, Modal, Select, Textarea } from '@/shared/components';
import { useToastStore } from '@/store';
import { createProduct, updateProduct } from '../services/products-service';
import { COMPANY_CHOICES, type Product } from '../types';

interface ProductFormModalProps {
  open: boolean;
  /** When set, the modal edits this product; otherwise it creates a new one. */
  editing: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

const DEFAULT_COMPANY = 'Transamerica';

export function ProductFormModal({ open, editing, onClose, onSaved }: ProductFormModalProps) {
  const { addToast } = useToastStore();
  const [companyName, setCompanyName] = useState(DEFAULT_COMPANY);
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [multiplier, setMultiplier] = useState('1');
  const [isActive, setIsActive] = useState(true);
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCompanyName(editing?.company_name ?? DEFAULT_COMPANY);
    setProductName(editing?.product_name ?? '');
    setDescription(editing?.product_description ?? '');
    setMultiplier(editing?.multiplier ?? '1');
    setIsActive(editing?.is_active ?? true);
    setEffectiveFrom(editing?.effective_from ?? '');
    setEffectiveTo(editing?.effective_to ?? '');
  }, [open, editing]);

  // Existing policies keep their snapshotted multiplier — warn on edit when in use.
  const showMultiplierWarning = !!editing && editing.policy_count > 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedName = productName.trim();
    if (!trimmedName) {
      addToast({ message: 'Product name is required', type: 'error' });
      return;
    }
    const multiplierValue = Number(multiplier);
    if (!Number.isFinite(multiplierValue) || multiplierValue <= 0) {
      addToast({ message: 'Multiplier must be greater than zero', type: 'error' });
      return;
    }
    if (effectiveFrom && effectiveTo && effectiveFrom > effectiveTo) {
      addToast({ message: 'Effective-to must be on or after effective-from', type: 'error' });
      return;
    }

    const payload = {
      company_name: companyName,
      product_name: trimmedName,
      product_description: description.trim(),
      multiplier,
      is_active: isActive,
      effective_from: effectiveFrom || null,
      effective_to: effectiveTo || null,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateProduct(editing.id, payload);
        addToast({ message: 'Product updated', type: 'success' });
      } else {
        await createProduct(payload);
        addToast({ message: 'Product created', type: 'success' });
      }
      onSaved();
      onClose();
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : 'Failed to save product',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={editing ? 'Edit Product' : 'Create Product'}
      onClose={onClose}
      contentClassName="max-w-[560px]"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80">
            Company
          </label>
          <Select value={companyName} onChange={(e) => setCompanyName(e.target.value)}>
            {COMPANY_CHOICES.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80">
            Product name
          </label>
          <Input
            placeholder="Product name"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80">
            Description
          </label>
          <Textarea
            placeholder="Optional description…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80">
            Multiplier
          </label>
          <Input
            type="number"
            step="0.0000001"
            min="0"
            value={multiplier}
            onChange={(e) => setMultiplier(e.target.value)}
          />
          {showMultiplierWarning && (
            <p className="mt-1 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-400/15 dark:text-amber-200">
              This product is used by {editing?.policy_count} policy
              {editing && editing.policy_count === 1 ? '' : 'ies'}. Existing policies keep
              their snapshotted multiplier — changing it here only affects policies written
              from now on.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80">
              Effective from
            </label>
            <Input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80">
              Effective to
            </label>
            <Input
              type="date"
              value={effectiveTo}
              onChange={(e) => setEffectiveTo(e.target.value)}
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 dark:text-white/80">
          <Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active (selectable for new policies)
        </label>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
