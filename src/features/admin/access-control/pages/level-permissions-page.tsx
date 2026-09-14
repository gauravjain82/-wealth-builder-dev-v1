import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, ConfirmationDialog, Modal, Select } from '@/shared/components';
import { useToastStore } from '@/store';
import { fetchLevels, type Level } from '@/features/team/prospect/services/prospect-service';
import { PermissionCascader } from '../components/permission-cascader';
import { listAllPermissions } from '../services/access-control-service';
import {
  createLevelPermission,
  deleteLevelPermission,
  listLevelPermissions,
} from '../services/level-permission-service';
import type { LevelPermissionItem, PermissionItem } from '../types';

export default function LevelPermissionsPage() {
  const { addToast } = useToastStore();
  const [levels, setLevels] = useState<Level[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [grants, setGrants] = useState<LevelPermissionItem[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [chosenPermission, setChosenPermission] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LevelPermissionItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reloadGrants = useCallback(async () => {
    setLoading(true);
    try {
      setGrants(await listLevelPermissions());
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : 'Failed to load level permissions',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    let cancelled = false;
    fetchLevels()
      .then((data) => {
        if (cancelled) return;
        setLevels(data);
        if (data.length) setSelectedLevel(data[0].id);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          addToast({
            message: err instanceof Error ? err.message : 'Failed to load levels',
            type: 'error',
          });
        }
      });
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

  useEffect(() => {
    void reloadGrants();
  }, [reloadGrants]);

  const rows = useMemo(
    () => grants.filter((grant) => grant.level === selectedLevel),
    [grants, selectedLevel],
  );

  const selectedLevelName = useMemo(
    () => levels.find((level) => level.id === selectedLevel)?.name ?? '',
    [levels, selectedLevel],
  );

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedLevel || !chosenPermission) return;
    setSaving(true);
    try {
      await createLevelPermission({ level: selectedLevel, permission: chosenPermission });
      addToast({ message: 'Permission granted to level', type: 'success' });
      setModalOpen(false);
      setChosenPermission(null);
      await reloadGrants();
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : 'Failed to grant permission',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLevelPermission(deleteTarget.id);
      addToast({ message: 'Grant removed', type: 'success' });
      setDeleteTarget(null);
      await reloadGrants();
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : 'Failed to remove grant',
        type: 'error',
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Level Permissions</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-white/60">
          Grant a permission to an entire level/rank. Every user at the level gains it, on top of
          what their roles allow. Grants are additive — there is no level-level DENY, and a grant to
          one level does not cascade to others. To block a single user, use a per-user DENY on the
          User Permissions page.
        </p>
      </div>

      <div className="max-w-3xl space-y-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80">
            Level
          </label>
          <Select
            value={selectedLevel ?? ''}
            onChange={(e) => setSelectedLevel(e.target.value ? Number(e.target.value) : null)}
            disabled={levels.length === 0}
          >
            {levels.length === 0 && <option value="">No levels available</option>}
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name} ({level.code})
              </option>
            ))}
          </Select>
        </div>

        {selectedLevel && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-white/80">
                Permissions granted to {selectedLevelName}
              </span>
              <Button
                onClick={() => {
                  setChosenPermission(null);
                  setModalOpen(true);
                }}
              >
                Grant permission
              </Button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-white/5 dark:text-white/50">
                  <tr>
                    <th className="px-4 py-3">Permission</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {loading && (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-4 py-6 text-center text-slate-500 dark:text-white/50"
                      >
                        Loading…
                      </td>
                    </tr>
                  )}
                  {!loading && rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-4 py-6 text-center text-slate-500 dark:text-white/50"
                      >
                        No permissions granted to this level.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    rows.map((row) => (
                      <tr key={row.id} className="text-slate-800 dark:text-white/80">
                        <td className="px-4 py-3">
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-white/10">
                            {row.permission_label}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteTarget(row)}
                            >
                              Remove
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

      <Modal
        open={modalOpen}
        title="Grant permission to level"
        onClose={() => setModalOpen(false)}
        contentClassName="max-w-[520px]"
      >
        <form className="space-y-4" onSubmit={handleCreate}>
          <p className="text-sm text-slate-600 dark:text-white/70">
            For <span className="font-semibold text-slate-900 dark:text-white">{selectedLevelName}</span>
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80">
              Permission
            </label>
            <PermissionCascader
              permissions={permissions}
              value={chosenPermission}
              onChange={setChosenPermission}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !chosenPermission}>
              {saving ? 'Saving…' : 'Grant'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        open={!!deleteTarget}
        title="Remove level permission"
        message={`Remove "${deleteTarget?.permission_label}" from ${deleteTarget?.level_name}? All users at this level lose it unless a role or per-user grant still provides it.`}
        confirmText="Remove"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
