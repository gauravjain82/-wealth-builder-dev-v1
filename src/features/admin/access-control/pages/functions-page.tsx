import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, ConfirmationDialog, Select } from '@/shared/components';
import { useToastStore } from '@/store';
import { FunctionFormModal } from '../components/function-form-modal';
import { UserPicker } from '../components/user-picker';
import { userDisplayName } from '../utils';
import {
  assignFunction,
  deleteFunction,
  listFunctions,
  listUserFunctions,
  toArray,
  unassignUserFunction,
} from '../services/access-control-service';
import type { FunctionItem, UserFunctionItem, UserSearchResult } from '../types';

type Tab = 'catalog' | 'assign';

export default function FunctionsPage() {
  const { addToast } = useToastStore();
  const [tab, setTab] = useState<Tab>('catalog');
  const [functions, setFunctions] = useState<FunctionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFunctions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listFunctions();
      setFunctions(toArray(data));
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : 'Failed to load functions',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void loadFunctions();
  }, [loadFunctions]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Functions</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-white/60">
          Functional capacities a user can hold (e.g. TRAINER, BUILDER) — distinct from roles and
          permissions.
        </p>
      </div>

      <div className="mb-6 flex gap-1 border-b border-slate-200 dark:border-white/10">
        <TabButton active={tab === 'catalog'} onClick={() => setTab('catalog')}>
          Catalog
        </TabButton>
        <TabButton active={tab === 'assign'} onClick={() => setTab('assign')}>
          Assign to users
        </TabButton>
      </div>

      {tab === 'catalog' ? (
        <CatalogTab
          functions={functions}
          loading={loading}
          onChanged={loadFunctions}
        />
      ) : (
        <AssignTab functions={functions} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        '-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors',
        active
          ? 'border-amber-400 text-amber-700 dark:text-amber-300'
          : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-white/50 dark:hover:text-white/80',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

/* --------------------------------------------------------------- Catalog tab */

function CatalogTab({
  functions,
  loading,
  onChanged,
}: {
  functions: FunctionItem[];
  loading: boolean;
  onChanged: () => Promise<void>;
}) {
  const { addToast } = useToastStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FunctionItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FunctionItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteFunction(deleteTarget.id);
      addToast({ message: 'Function deleted', type: 'success' });
      setDeleteTarget(null);
      await onChanged();
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : 'Failed to delete function',
        type: 'error',
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          Create function
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-white/5 dark:text-white/50">
            <tr>
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500 dark:text-white/50">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && functions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500 dark:text-white/50">
                  No functions yet. Create one to get started.
                </td>
              </tr>
            )}
            {functions.map((fn) => (
              <tr key={fn.id} className="text-slate-800 dark:text-white/80">
                <td className="px-4 py-3 font-medium">{fn.label}</td>
                <td className="px-4 py-3">
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-white/10">
                    {fn.slug}
                  </code>
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-white/50">
                  {fn.description || '—'}
                </td>
                <td className="px-4 py-3">
                  <ActiveBadge active={fn.is_active} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(fn);
                        setModalOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(fn)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FunctionFormModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSaved={onChanged}
      />

      <ConfirmationDialog
        open={!!deleteTarget}
        title="Delete function"
        message={`Delete "${deleteTarget?.label}"? This also removes it from every user it is assigned to.`}
        confirmText="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
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

/* ---------------------------------------------------------------- Assign tab */

function AssignTab({ functions }: { functions: FunctionItem[] }) {
  const { addToast } = useToastStore();
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [assignments, setAssignments] = useState<UserFunctionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addValue, setAddValue] = useState('');
  const [busy, setBusy] = useState(false);

  const activeFunctions = useMemo(() => functions.filter((fn) => fn.is_active), [functions]);
  const assignedFunctionIds = useMemo(
    () => new Set(assignments.map((a) => a.function)),
    [assignments],
  );
  const availableFunctions = useMemo(
    () => activeFunctions.filter((fn) => !assignedFunctionIds.has(fn.id)),
    [activeFunctions, assignedFunctionIds],
  );
  const functionLabelById = useMemo(() => {
    const map = new Map<number, string>();
    functions.forEach((fn) => map.set(fn.id, fn.label));
    return map;
  }, [functions]);

  const loadAssignments = useCallback(
    async (userId: number) => {
      setLoading(true);
      try {
        const data = await listUserFunctions(userId);
        setAssignments(toArray(data));
      } catch (err) {
        addToast({
          message: err instanceof Error ? err.message : 'Failed to load assignments',
          type: 'error',
        });
      } finally {
        setLoading(false);
      }
    },
    [addToast],
  );

  useEffect(() => {
    if (selectedUser) void loadAssignments(selectedUser.id);
    else setAssignments([]);
  }, [selectedUser, loadAssignments]);

  async function handleAdd() {
    if (!selectedUser || !addValue) return;
    setBusy(true);
    try {
      await assignFunction(selectedUser.id, Number(addValue));
      addToast({ message: 'Function assigned', type: 'success' });
      setAddValue('');
      await loadAssignments(selectedUser.id);
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : 'Failed to assign function',
        type: 'error',
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(assignment: UserFunctionItem) {
    if (!selectedUser) return;
    setBusy(true);
    try {
      await unassignUserFunction(assignment.id);
      addToast({ message: 'Function removed', type: 'success' });
      await loadAssignments(selectedUser.id);
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : 'Failed to remove function',
        type: 'error',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80">
          User
        </label>
        <UserPicker
          selectedUser={selectedUser}
          onSelect={setSelectedUser}
          onClear={() => setSelectedUser(null)}
        />
      </div>

      {selectedUser && (
        <div className="space-y-4">
          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-white/80">
              Assigned functions
            </span>
            {loading ? (
              <p className="text-sm text-slate-500 dark:text-white/50">Loading…</p>
            ) : assignments.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-white/50">
                {userDisplayName(selectedUser)} has no functions yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {assignments.map((assignment) => (
                  <span
                    key={assignment.id}
                    className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-800 dark:bg-amber-400/15 dark:text-amber-200"
                  >
                    {functionLabelById.get(assignment.function) || assignment.function_slug}
                    <button
                      type="button"
                      onClick={() => handleRemove(assignment)}
                      disabled={busy}
                      className="text-amber-700 hover:text-amber-900 disabled:opacity-40 dark:text-amber-300"
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80">
                Add function
              </label>
              <Select
                value={addValue}
                onChange={(e) => setAddValue(e.target.value)}
                disabled={availableFunctions.length === 0}
              >
                <option value="">
                  {availableFunctions.length === 0
                    ? 'No more functions to add'
                    : 'Select a function…'}
                </option>
                {availableFunctions.map((fn) => (
                  <option key={fn.id} value={fn.id}>
                    {fn.label} ({fn.slug})
                  </option>
                ))}
              </Select>
            </div>
            <Button onClick={handleAdd} disabled={!addValue || busy}>
              Assign
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
