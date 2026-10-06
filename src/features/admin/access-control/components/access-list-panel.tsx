import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, ConfirmationDialog, Input, Select } from '@/shared/components';
import { useToastStore } from '@/store';
import {
  bulkRevokeUserPermissions,
  queryUserPermissions,
  toArray,
} from '../services/access-control-service';
import { UserPermissionFormModal } from './user-permission-form-modal';
import type { PermissionEffect, PermissionItem, UserPermissionItem } from '../types';

interface AccessListPanelProps {
  permissions: PermissionItem[];
  /** Bumped by the parent to force a reload (e.g. after a bulk grant). */
  refreshKey: number;
}

const PAGE_SIZE = 50;

/**
 * Every explicit per-user override across all agents, filterable by resource,
 * action, effect and free text (name, email, agency code, reason). Rows can be
 * ticked and revoked together; protected grants are shown locked and cannot be
 * ticked, since the backend refuses to remove them.
 */
export function AccessListPanel({ permissions, refreshKey }: AccessListPanelProps) {
  const { addToast } = useToastStore();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [resource, setResource] = useState('');
  const [action, setAction] = useState('');
  const [effect, setEffect] = useState<PermissionEffect | ''>('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<UserPermissionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [editing, setEditing] = useState<UserPermissionItem | null>(null);
  // Filter changes can fire overlapping requests; only the latest may update the table.
  const requestSeq = useRef(0);

  const resources = useMemo(
    () => [...new Set(permissions.map((p) => p.resource))].sort((a, b) => a.localeCompare(b)),
    [permissions],
  );
  const actions = useMemo(
    () =>
      [
        ...new Set(
          permissions.filter((p) => !resource || p.resource === resource).map((p) => p.action),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [permissions, resource],
  );

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handle);
  }, [search]);

  // Filters change the result set, so start again from page 1 with nothing ticked.
  useEffect(() => {
    setPage(1);
    setChecked(new Set());
  }, [debouncedSearch, resource, action, effect]);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const data = await queryUserPermissions({
        search: debouncedSearch,
        resource,
        action,
        effect,
        page,
        pageSize: PAGE_SIZE,
      });
      if (seq !== requestSeq.current) return;
      const list = toArray(data);
      setRows(list);
      setTotal(Array.isArray(data) ? list.length : data.count);
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : 'Failed to load access list',
        type: 'error',
      });
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [debouncedSearch, resource, action, effect, page, addToast]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const selectable = rows.filter((r) => !r.is_protected);
  const allChecked = selectable.length > 0 && selectable.every((r) => checked.has(r.id));

  function toggle(id: number) {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
  }

  function toggleAll() {
    const next = new Set(checked);
    for (const row of selectable) {
      if (allChecked) next.delete(row.id);
      else next.add(row.id);
    }
    setChecked(next);
  }

  async function revoke() {
    setRevoking(true);
    try {
      const result = await bulkRevokeUserPermissions([...checked]);
      const skipped = result.skipped_protected.length;
      addToast({
        message: `Revoked ${result.deleted}` + (skipped ? `, ${skipped} protected kept` : ''),
        type: 'success',
      });
      setChecked(new Set());
      setConfirmOpen(false);
      await load();
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : 'Failed to revoke',
        type: 'error',
      });
    } finally {
      setRevoking(false);
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Search name, email, agency code, reason…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          value={resource}
          onChange={(e) => {
            setResource(e.target.value);
            setAction('');
          }}
        >
          <option value="">All resources</option>
          {resources.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <Select value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        <Select
          value={effect}
          onChange={(e) => setEffect(e.target.value as PermissionEffect | '')}
        >
          <option value="">Grant & deny</option>
          <option value="GRANT">Grant only</option>
          <option value="DENY">Deny only</option>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500 dark:text-white/60">
          {total} override{total === 1 ? '' : 's'}
          {checked.size > 0 && ` · ${checked.size} selected`}
        </span>
        <Button
          variant="destructive"
          size="sm"
          disabled={checked.size === 0}
          onClick={() => setConfirmOpen(true)}
        >
          Revoke selected
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-white/5 dark:text-white/50">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  aria-label="Select all on this page"
                  checked={allChecked}
                  disabled={selectable.length === 0}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Permission</th>
              <th className="px-4 py-3">Effect</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Granted</th>
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
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500 dark:text-white/50">
                  No explicit overrides match. Access for these agents is entirely role-based.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => (
                <tr key={row.id} className="text-slate-800 dark:text-white/80">
                  <td className="px-4 py-3">
                    {row.is_protected ? (
                      <span title="Protected grant — cannot be revoked here" aria-label="Protected">
                        🔒
                      </span>
                    ) : (
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checked.has(row.id)}
                        onChange={() => toggle(row.id)}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.user_name || `User #${row.user}`}</div>
                    <div className="text-xs text-slate-500 dark:text-white/50">
                      {row.user_agency_code || 'no agency code'}
                      {row.user_email ? ` · ${row.user_email}` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-white/10">
                      {row.permission_label}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <EffectBadge effect={row.effect} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-white/50">
                    {row.reason || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-white/50">
                    {row.granted_by_name || '—'}
                    <div>{new Date(row.updated_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => setEditing(row)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-slate-500 dark:text-white/60">
            Page {page} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {editing && (
        <UserPermissionFormModal
          open={!!editing}
          userId={editing.user}
          userName={editing.user_name || `User #${editing.user}`}
          permissions={permissions}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => void load()}
        />
      )}

      <ConfirmationDialog
        open={confirmOpen}
        title="Revoke overrides"
        message={`Remove ${checked.size} override${checked.size === 1 ? '' : 's'}? Affected agents fall back to their role-based access.`}
        confirmText="Revoke"
        loading={revoking}
        onConfirm={revoke}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function EffectBadge({ effect }: { effect: PermissionEffect }) {
  return effect === 'GRANT' ? (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
      GRANT
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300">
      DENY
    </span>
  );
}
