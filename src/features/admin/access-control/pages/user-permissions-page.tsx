import { useCallback, useEffect, useState } from 'react';
import { Button, ConfirmationDialog } from '@/shared/components';
import { useToastStore } from '@/store';
import { UserPermissionFormModal } from '../components/user-permission-form-modal';
import { UserPicker } from '../components/user-picker';
import { userDisplayName } from '../utils';
import {
  deleteUserPermission,
  listAllPermissions,
  listUserPermissions,
  toArray,
} from '../services/access-control-service';
import type { PermissionItem, UserPermissionItem, UserSearchResult } from '../types';

export default function UserPermissionsPage() {
  const { addToast } = useToastStore();
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [overrides, setOverrides] = useState<UserPermissionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserPermissionItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserPermissionItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listAllPermissions()
      .then((data) => {
        if (!cancelled) setPermissions(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          addToast({
            message: err instanceof Error ? err.message : 'Failed to load permissions',
            type: 'error',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [addToast]);

  const loadOverrides = useCallback(
    async (userId: number) => {
      setLoading(true);
      try {
        const data = await listUserPermissions(userId);
        setOverrides(toArray(data));
      } catch (err) {
        addToast({
          message: err instanceof Error ? err.message : 'Failed to load overrides',
          type: 'error',
        });
      } finally {
        setLoading(false);
      }
    },
    [addToast],
  );

  useEffect(() => {
    if (selectedUser) void loadOverrides(selectedUser.id);
    else setOverrides([]);
  }, [selectedUser, loadOverrides]);

  async function handleDelete() {
    if (!deleteTarget || !selectedUser) return;
    setDeleting(true);
    try {
      await deleteUserPermission(deleteTarget.id);
      addToast({ message: 'Override removed', type: 'success' });
      setDeleteTarget(null);
      await loadOverrides(selectedUser.id);
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : 'Failed to remove override',
        type: 'error',
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Permissions</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-white/60">
          Per-user permission overrides. A GRANT gives access even if the user's roles don't; a
          DENY blocks access even if their roles allow it. Overrides win over role-based
          permissions.
        </p>
      </div>

      <div className="max-w-3xl space-y-6">
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
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-white/80">
                Overrides for {userDisplayName(selectedUser)}
              </span>
              <Button
                onClick={() => {
                  setEditing(null);
                  setModalOpen(true);
                }}
              >
                Add override
              </Button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-white/5 dark:text-white/50">
                  <tr>
                    <th className="px-4 py-3">Permission</th>
                    <th className="px-4 py-3">Effect</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {loading && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-slate-500 dark:text-white/50"
                      >
                        Loading…
                      </td>
                    </tr>
                  )}
                  {!loading && overrides.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-slate-500 dark:text-white/50"
                      >
                        No overrides. This user's access is entirely role-based.
                      </td>
                    </tr>
                  )}
                  {overrides.map((override) => (
                    <tr key={override.id} className="text-slate-800 dark:text-white/80">
                      <td className="px-4 py-3">
                        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-white/10">
                          {override.permission_label}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <EffectBadge effect={override.effect} />
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-white/50">
                        {override.reason || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditing(override);
                              setModalOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteTarget(override)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {selectedUser && (
        <UserPermissionFormModal
          open={modalOpen}
          userId={selectedUser.id}
          userName={userDisplayName(selectedUser)}
          permissions={permissions}
          editing={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => loadOverrides(selectedUser.id)}
        />
      )}

      <ConfirmationDialog
        open={!!deleteTarget}
        title="Remove override"
        message={`Remove the ${deleteTarget?.effect} override on "${deleteTarget?.permission_label}"?`}
        confirmText="Remove"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function EffectBadge({ effect }: { effect: UserPermissionItem['effect'] }) {
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
