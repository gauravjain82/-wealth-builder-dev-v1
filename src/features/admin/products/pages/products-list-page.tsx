import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, ConfirmationDialog, Input, Select } from '@/shared/components';
import { useToastStore } from '@/store';
import { ProductFormModal } from '../components/product-form-modal';
import { ProductHistoryModal } from '../components/product-history-modal';
import { useProductsAccess } from '../hooks/use-products';
import {
  activateProduct,
  deactivateProduct,
  listProducts,
} from '../services/products-service';
import { COMPANY_CHOICES, PRODUCT_TYPE_CHOICES, productTypeLabel, type Product } from '../types';

type StatusFilter = 'all' | 'active' | 'inactive';
/** Sentinel type-filter value matching legacy products with no type set. */
const UNTYPED = '__untyped__';

export default function ProductsListPage() {
  const { addToast } = useToastStore();
  const { data: access } = useProductsAccess();
  const canManage = Boolean(access?.can_manage);
  const canViewHistory = Boolean(access?.can_view_history);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Client-side search + filters (the catalog is small and loaded whole).
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await listProducts());
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : 'Failed to load products',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      if (companyFilter && product.company_name !== companyFilter) return false;
      if (typeFilter === UNTYPED) {
        if (product.product_type) return false;
      } else if (typeFilter && product.product_type !== typeFilter) {
        return false;
      }
      if (statusFilter === 'active' && !product.is_active) return false;
      if (statusFilter === 'inactive' && product.is_active) return false;
      if (
        term &&
        !`${product.product_name} ${product.product_description} ${product.company_name}`
          .toLowerCase()
          .includes(term)
      ) {
        return false;
      }
      return true;
    });
  }, [products, search, companyFilter, typeFilter, statusFilter]);

  const hasActiveFilters =
    !!search || !!companyFilter || !!typeFilter || statusFilter !== 'all';

  async function handleToggleActive() {
    if (!toggleTarget) return;
    setBusy(true);
    try {
      if (toggleTarget.is_active) {
        await deactivateProduct(toggleTarget.id);
        addToast({ message: 'Product deactivated', type: 'success' });
      } else {
        await activateProduct(toggleTarget.id);
        addToast({ message: 'Product activated', type: 'success' });
      }
      setToggleTarget(null);
      await loadProducts();
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : 'Failed to update product',
        type: 'error',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Products</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-white/60">
            Manage the product catalog. Products drive the multiplier applied to policy
            points; deactivated products stay on existing policies but can't be selected for
            new ones.
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Create product
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/50">
            Search
          </label>
          <Input
            placeholder="Name, description or company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/50">
            Company
          </label>
          <Select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
            <option value="">All companies</option>
            {COMPANY_CHOICES.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/50">
            Type
          </label>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            {PRODUCT_TYPE_CHOICES.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
            <option value={UNTYPED}>Untyped</option>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/50">
            Status
          </label>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setCompanyFilter('');
              setTypeFilter('');
              setStatusFilter('all');
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <div className="mb-2 text-xs text-slate-500 dark:text-white/50">
        Showing {filteredProducts.length} of {products.length}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-white/5 dark:text-white/50">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Multiplier</th>
              <th className="px-4 py-3 text-right">Policies</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500 dark:text-white/50">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500 dark:text-white/50">
                  No products yet.
                </td>
              </tr>
            )}
            {!loading && products.length > 0 && filteredProducts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500 dark:text-white/50">
                  No products match your filters.
                </td>
              </tr>
            )}
            {filteredProducts.map((product) => (
              <tr key={product.id} className="text-slate-800 dark:text-white/80">
                <td className="px-4 py-3">{product.company_name}</td>
                <td className="px-4 py-3 font-medium">
                  {product.product_name}
                  {product.product_description && (
                    <span className="block text-xs text-slate-400 dark:text-white/40">
                      {product.product_description}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{productTypeLabel(product.product_type)}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  ×{Number(product.multiplier)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{product.policy_count}</td>
                <td className="px-4 py-3">
                  <ActiveBadge active={product.is_active} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {canViewHistory && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setHistoryProduct(product)}
                      >
                        History
                      </Button>
                    )}
                    {canManage && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditing(product);
                            setModalOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant={product.is_active ? 'destructive' : 'secondary'}
                          size="sm"
                          onClick={() => setToggleTarget(product)}
                        >
                          {product.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ProductFormModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSaved={loadProducts}
      />

      <ProductHistoryModal
        open={!!historyProduct}
        product={historyProduct}
        contentTypeId={access?.content_type_id}
        onClose={() => setHistoryProduct(null)}
      />

      <ConfirmationDialog
        open={!!toggleTarget}
        title={toggleTarget?.is_active ? 'Deactivate product' : 'Activate product'}
        message={
          toggleTarget?.is_active
            ? `Deactivate "${toggleTarget?.product_name}"? It will no longer be selectable for new policies. Existing policies are unaffected.`
            : `Activate "${toggleTarget?.product_name}"? It will become selectable for new policies again.`
        }
        confirmText={toggleTarget?.is_active ? 'Deactivate' : 'Activate'}
        loading={busy}
        onConfirm={handleToggleActive}
        onClose={() => setToggleTarget(null)}
      />
    </div>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
      Active
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-white/50">
      Inactive
    </span>
  );
}
