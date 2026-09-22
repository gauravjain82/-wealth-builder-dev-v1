import { Modal } from '@/shared/components';
import { useProductHistory } from '../hooks/use-products';
import type { AuditEntry, Product } from '../types';

interface ProductHistoryModalProps {
  open: boolean;
  product: Product | null;
  /** ContentType id of CompanyProduct (from the my-access endpoint). */
  contentTypeId: number | undefined;
  onClose: () => void;
}

const ACTION_LABEL: Record<AuditEntry['action'], string> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
};

/** Renders a value from an audit `changes` diff for display. */
function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function ProductHistoryModal({
  open,
  product,
  contentTypeId,
  onClose,
}: ProductHistoryModalProps) {
  const { data, isLoading, isError } = useProductHistory(
    contentTypeId,
    open && product ? product.id : null,
  );

  return (
    <Modal
      open={open}
      title={product ? `History — ${product.product_name}` : 'History'}
      onClose={onClose}
      contentClassName="max-w-[640px]"
    >
      <div className="max-h-[70vh] space-y-3 overflow-y-auto">
        {isLoading && (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-white/50">Loading…</p>
        )}
        {isError && (
          <p className="py-6 text-center text-sm text-red-600 dark:text-red-400">
            Failed to load history.
          </p>
        )}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-white/50">
            No changes recorded yet.
          </p>
        )}
        {data?.map((entry) => (
          <div
            key={entry.id}
            className="rounded-lg border border-slate-200 p-3 text-sm dark:border-white/10"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-white/90">
                {ACTION_LABEL[entry.action] ?? entry.action}
                {' by '}
                {entry.actor_username || entry.actor_repr || 'system'}
              </span>
              <span className="text-xs text-slate-500 dark:text-white/50">
                {new Date(entry.created_at).toLocaleString()}
              </span>
            </div>
            {Object.keys(entry.changes ?? {}).length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 dark:text-white/40">
                  <tr>
                    <th className="py-1 pr-3 font-medium">Field</th>
                    <th className="py-1 pr-3 font-medium">Old</th>
                    <th className="py-1 font-medium">New</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700 dark:text-white/70">
                  {Object.entries(entry.changes).map(([field, diff]) => (
                    <tr key={field} className="align-top">
                      <td className="py-1 pr-3 font-mono">{field}</td>
                      <td className="py-1 pr-3">{formatValue(diff.old)}</td>
                      <td className="py-1">{formatValue(diff.new)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-slate-500 dark:text-white/50">No field changes.</p>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
