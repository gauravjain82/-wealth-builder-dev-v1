import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Label, Modal, Select } from '@/shared/components';
import type { ProductionCompanyProduct } from '../services/production-tracker-service';

const NEW_COMPANY_VALUE = '__new_company__';

export function NewProductModal({
  open,
  saving,
  products,
  onClose,
  onSubmit,
}: {
  open: boolean;
  saving: boolean;
  products: ProductionCompanyProduct[];
  onClose: () => void;
  onSubmit: (payload: { company_name: string; product_name: string; multiplier: number }) => Promise<void>;
}) {
  const [companyMode, setCompanyMode] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [productName, setProductName] = useState('');
  const [multiplier, setMultiplier] = useState('1');

  const companyOptions = useMemo(
    () => Array.from(new Set(products.map((item) => item.company_name).filter(Boolean))).sort(),
    [products]
  );

  useEffect(() => {
    if (!open) return;
    setCompanyMode('');
    setNewCompany('');
    setProductName('');
    setMultiplier('1');
  }, [open]);

  if (!open) return null;

  const companyName = companyMode === NEW_COMPANY_VALUE ? newCompany.trim() : companyMode.trim();
  const parsedMultiplier = Number(multiplier);
  const canSubmit =
    Boolean(companyName) &&
    Boolean(productName.trim()) &&
    Number.isFinite(parsedMultiplier) &&
    parsedMultiplier > 0 &&
    !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSubmit({
      company_name: companyName,
      product_name: productName.trim(),
      multiplier: parsedMultiplier,
    });
  };

  return (
    <Modal open={open} title="New Product" onClose={onClose} contentClassName="max-w-[640px]">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <p className="text-sm text-slate-500 dark:text-white/60">
          Add a company product so it appears in Production Tracker dropdowns. This follows the same
          option-catalog pattern used elsewhere on the site.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label variant="form">Company</Label>
            <Select value={companyMode} onChange={(event) => setCompanyMode(event.target.value)}>
              <option value="">Select company</option>
              {companyOptions.map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
              <option value={NEW_COMPANY_VALUE}>+ New company</option>
            </Select>
          </div>
          {companyMode === NEW_COMPANY_VALUE && (
            <div>
              <Label variant="form">New company name</Label>
              <Input
                variant="surface"
                value={newCompany}
                onChange={(event) => setNewCompany(event.target.value)}
                placeholder="Company name"
              />
            </div>
          )}
          <div>
            <Label variant="form">Product name</Label>
            <Input
              variant="surface"
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              placeholder="Product name"
            />
          </div>
          <div>
            <Label variant="form">Multiplier</Label>
            <Input
              variant="surface"
              type="number"
              min="0"
              step="0.01"
              value={multiplier}
              onChange={(event) => setMultiplier(event.target.value)}
            />
          </div>
        </div>

        {products.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-white/60">
                  <th className="px-3 py-2">Company</th>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Multiplier</th>
                </tr>
              </thead>
              <tbody>
                {products
                  .slice()
                  .sort((a, b) =>
                    `${a.company_name}${a.product_name}`.localeCompare(`${b.company_name}${b.product_name}`)
                  )
                  .map((item) => (
                    <tr key={item.id} className="border-t border-slate-100 dark:border-white/10">
                      <td className="px-3 py-2">{item.company_name}</td>
                      <td className="px-3 py-2">{item.product_name}</td>
                      <td className="px-3 py-2">{item.multiplier}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {saving ? 'Adding…' : 'Add product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
