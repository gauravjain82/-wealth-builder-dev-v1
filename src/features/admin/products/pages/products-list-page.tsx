import { useCallback, useEffect, useState } from 'react';
import { Button, ConfirmationDialog } from '@/shared/components';
import { useToastStore } from '@/store';
import { ProductFormModal } from '../components/product-form-modal';
import { ProductHistoryModal } from '../components/product-history-modal';
import { useProductsAccess } from '../hooks/use-products';
import {
  activateProduct,
  deactivateProduct,
  listProducts,
} from '../services/products-service';
import type { Product } from '../types';

export default function ProductsListPage() {
  const { addToast } = useToastStore();
  const { data: access } = useProductsAccess();
  const canManage = Boolean(access?.can_manage);
  const canViewHistory = Boolean(access?.can_view_history);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

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

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-white/5 dark:text-white/50">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3 text-right">Multiplier</th>
              <th className="px-4 py-3 text-right">Policies</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500 dark:text-white/50">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500 dark:text-white/50">
                  No products yet.
                </td>
              </tr>
            )}
            {products.map((product) => (
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
