import { useEffect, useState } from 'react';
import { Button, Input } from '@/shared/components';
import type { FileVaultSectionAdmin } from '@/features/file-vault/types';
import { RoleAccessPicker } from './role-access-picker';

type SectionFormModalProps = {
  open: boolean;
  section?: FileVaultSectionAdmin | null;
  onClose: () => void;
  onSave: (payload: {
    section_key: string;
    label: string;
    icon: string;
    sort_order: number;
    is_active: boolean;
    roles: string[];
  }) => Promise<void>;
};

export function SectionFormModal({ open, section, onClose, onSave }: SectionFormModalProps) {
  const [sectionKey, setSectionKey] = useState('');
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('📁');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSectionKey(section?.section_key ?? '');
    setLabel(section?.label ?? '');
    setIcon(section?.icon ?? '📁');
    setSortOrder(section?.sort_order ?? 0);
    setIsActive(section?.is_active ?? true);
    setRoles(section?.allowed_roles ?? []);
  }, [open, section]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({
        section_key: sectionKey.trim(),
        label: label.trim(),
        icon: icon.trim() || '📁',
        sort_order: sortOrder,
        is_active: isActive,
        roles,
      });
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save section');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#1a1d25] p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-white">
          {section ? 'Edit section' : 'Add section'}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-white/70">Section key</label>
            <Input
              value={sectionKey}
              onChange={(event) => setSectionKey(event.target.value)}
              placeholder="presentations"
              required
              disabled={Boolean(section)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/70">Label</label>
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Presentations"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-white/70">Icon</label>
              <Input value={icon} onChange={(event) => setIcon(event.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/70">Sort order</label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(event) => setSortOrder(Number(event.target.value))}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Active
          </label>
          <RoleAccessPicker
            value={roles}
            onChange={setRoles}
            hint="Leave empty to allow all authenticated roles."
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  );
}
