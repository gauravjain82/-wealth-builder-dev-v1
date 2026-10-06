import { useEffect, useState } from 'react';
import { Button, Textarea } from '@/shared/components';
import { useToastStore } from '@/store';
import { bulkGrantUserPermissions } from '../services/access-control-service';
import { MultiUserPicker } from './multi-user-picker';
import { PermissionMatrix } from './permission-matrix';
import type {
  BulkGrantResult,
  PermissionEffect,
  PermissionItem,
  UserSearchResult,
} from '../types';

interface BulkGrantPanelProps {
  permissions: PermissionItem[];
  /** Called after a successful (non-dry-run) apply. */
  onApplied: () => void;
}

/** Mirrors the backend cap (authz MAX_BULK_PAIRS). */
const MAX_PAIRS = 2000;

/**
 * Grant or deny many permissions to many agents in one step. "Preview" runs the
 * request as a dry run so the admin sees exactly how many overrides will be
 * created, updated or left alone before anything is written.
 */
export function BulkGrantPanel({ permissions, onApplied }: BulkGrantPanelProps) {
  const { addToast } = useToastStore();
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [effect, setEffect] = useState<PermissionEffect>('GRANT');
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<BulkGrantResult | null>(null);
  const [busy, setBusy] = useState(false);

  const pairs = users.length * selected.size;

  // Any change to the inputs makes an earlier preview stale.
  useEffect(() => {
    setPreview(null);
  }, [users, selected, effect, reason]);

  async function submit(dryRun: boolean) {
    setBusy(true);
    try {
      const result = await bulkGrantUserPermissions({
        users: users.map((u) => u.id),
        permissions: [...selected],
        effect,
        reason: reason.trim(),
        dry_run: dryRun,
      });
      if (dryRun) {
        setPreview(result);
        return;
      }
      const skipped = result.skipped_protected.length;
      addToast({
        message:
          `${result.created} added, ${result.updated} updated, ${result.unchanged} unchanged` +
          (skipped ? `, ${skipped} protected left as-is` : ''),
        type: 'success',
      });
      setUsers([]);
      setSelected(new Set());
      setReason('');
      onApplied();
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : 'Failed to apply permissions',
        type: 'error',
      });
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = pairs > 0 && pairs <= MAX_PAIRS && !busy;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-800 dark:text-white">1. Agents</h2>
        <MultiUserPicker value={users} onChange={setUsers} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-800 dark:text-white">
          2. Permissions
        </h2>
        <PermissionMatrix permissions={permissions} value={selected} onChange={setSelected} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">3. Effect & reason</h2>
        <div className="flex flex-wrap gap-3">
          {(['GRANT', 'DENY'] as const).map((value) => (
            <label
              key={value}
              className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                effect === value
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                  : 'border-slate-300 dark:border-white/15'
              }`}
            >
              <input
                type="radio"
                name="bulk-effect"
                className="mt-0.5"
                checked={effect === value}
                onChange={() => setEffect(value)}
              />
              <span>
                <span className="font-medium text-slate-900 dark:text-white">{value}</span>
                <span className="block text-xs text-slate-500 dark:text-white/50">
                  {value === 'GRANT'
                    ? "Give access even if their roles don't"
                    : 'Block access even if their roles allow it'}
                </span>
              </span>
            </label>
          ))}
        </div>
        <Textarea
          placeholder="Reason (shown in the access list, e.g. 'Pilot for Q4 reporting')"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
        />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
        <div className="text-sm text-slate-700 dark:text-white/80">
          {users.length} agent{users.length === 1 ? '' : 's'} × {selected.size} permission
          {selected.size === 1 ? '' : 's'} = <strong>{pairs}</strong> override
          {pairs === 1 ? '' : 's'}
          {pairs > MAX_PAIRS && (
            <span className="ml-2 text-red-600">Limit is {MAX_PAIRS}; split into batches.</span>
          )}
          {preview && (
            <span className="mt-1 block text-xs text-slate-500 dark:text-white/60">
              Preview: {preview.created} new, {preview.updated} updated, {preview.unchanged}{' '}
              already set
              {preview.skipped_protected.length > 0 &&
                `, ${preview.skipped_protected.length} protected will be left as-is`}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={!canSubmit} onClick={() => submit(true)}>
            Preview
          </Button>
          <Button disabled={!canSubmit} onClick={() => submit(false)}>
            {busy ? 'Applying…' : `Apply ${effect}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
