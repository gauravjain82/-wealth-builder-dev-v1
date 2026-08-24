import { useEffect, useState } from 'react';
import { Button, Modal, Select, Textarea } from '@/shared/components';
import { useToastStore } from '@/store';
import {
  createUserPermission,
  updateUserPermission,
} from '../services/access-control-service';
import { PermissionCascader } from './permission-cascader';
import type { PermissionEffect, PermissionItem, UserPermissionItem } from '../types';

interface UserPermissionFormModalProps {
  open: boolean;
  userId: number;
  userName: string;
  permissions: PermissionItem[];
  /** When set, edits this override; otherwise creates a new one. */
  editing: UserPermissionItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export function UserPermissionFormModal({
  open,
  userId,
  userName,
  permissions,
  editing,
  onClose,
  onSaved,
}: UserPermissionFormModalProps) {
  const { addToast } = useToastStore();
  const [permissionId, setPermissionId] = useState<number | null>(null);
  const [effect, setEffect] = useState<PermissionEffect>('GRANT');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPermissionId(editing ? editing.permission : null);
    setEffect(editing?.effect ?? 'GRANT');
    setReason(editing?.reason ?? '');
  }, [open, editing]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!permissionId) {
      addToast({ message: 'Select a permission', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateUserPermission(editing.id, { effect, reason: reason.trim() });
        addToast({ message: 'Override updated', type: 'success' });
      } else {
        await createUserPermission({
          user: userId,
          permission: permissionId,
          effect,
          reason: reason.trim(),
        });
        addToast({ message: 'Override added', type: 'success' });
      }
      onSaved();
      onClose();
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : 'Failed to save override',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={editing ? 'Edit permission override' : 'Add permission override'}
      onClose={onClose}
      contentClassName="max-w-[520px]"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="text-sm text-slate-600 dark:text-white/70">
          For <span className="font-semibold text-slate-900 dark:text-white">{userName}</span>
        </p>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80">
            Permission
          </label>
          <PermissionCascader
            permissions={permissions}
            value={permissionId}
            onChange={setPermissionId}
            disabled={!!editing}
          />
          {editing && (
            <p className="mt-1 text-xs text-slate-500 dark:text-white/50">
              To target a different permission, delete this override and add a new one.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80">
            Effect
          </label>
          <Select value={effect} onChange={(e) => setEffect(e.target.value as PermissionEffect)}>
            <option value="GRANT">GRANT — give access even if roles don't</option>
            <option value="DENY">DENY — block access even if roles allow</option>
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80">
            Reason
          </label>
          <Textarea
            placeholder="Why this override exists…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add override'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
