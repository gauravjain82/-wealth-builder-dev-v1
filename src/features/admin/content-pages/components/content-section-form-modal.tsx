import { useEffect, useState } from 'react';
import { Button, Input } from '@/shared/components';
import { RoleAccessPicker } from './role-access-picker';
import { VisibleToPicker } from './visible-to-picker';
import type { ContentSectionAdmin, ContentSectionFormPayload, RoleOption } from '../types';

type ContentSectionFormModalProps = {
  open: boolean;
  section?: ContentSectionAdmin | null;
  onClose: () => void;
  onSave: (payload: ContentSectionFormPayload) => Promise<void>;
  nounSingular?: string;
  defaultIcon?: string;
  keyPlaceholder?: string;
  labelPlaceholder?: string;
  /** Show the editable key. Off when the backend derives it from the name. */
  showKeyField?: boolean;
  nameLabel?: string;
  activeLabel?: string;
  /** `chips` = raw role toggles (default); `presets` = "Visible to" presets + Custom. */
  rolePicker?: 'chips' | 'presets';
  roleOptions?: RoleOption[];
};

export function ContentSectionFormModal({
  open,
  section,
  onClose,
  onSave,
  nounSingular = 'section',
  defaultIcon = '📁',
  keyPlaceholder = 'presentations',
  labelPlaceholder = 'Presentations',
  showKeyField = true,
  nameLabel = 'Label',
  activeLabel = 'Active',
  rolePicker = 'chips',
  roleOptions,
}: ContentSectionFormModalProps) {
  const [sectionKey, setSectionKey] = useState('');
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState(defaultIcon);
  const [isActive, setIsActive] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setSectionKey(section?.section_key ?? '');
    setLabel(section?.label ?? '');
    setIcon(section?.icon ?? defaultIcon);
    setIsActive(section?.is_active ?? true);
    setRoles(section?.allowed_roles ?? []);
    setErrorMessage('');
  }, [open, section, defaultIcon]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage('');
    try {
      await onSave({
        section_key: sectionKey.trim(),
        label: label.trim(),
        icon: icon.trim() || defaultIcon,
        is_active: isActive,
        roles,
      });
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : `Failed to save ${nounSingular}`
      );
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
          {section ? `Edit ${nounSingular}` : `Add ${nounSingular}`}
        </h2>

        <div className="space-y-4">
          {showKeyField && (
            <div>
              <label className="mb-1 block text-sm text-white/70">Key</label>
              <Input
                value={sectionKey}
                onChange={(event) => setSectionKey(event.target.value)}
                placeholder={keyPlaceholder}
                required
                disabled={Boolean(section)}
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm text-white/70">{nameLabel}</label>
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={labelPlaceholder}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/70">Icon</label>
            <Input value={icon} onChange={(event) => setIcon(event.target.value)} />
          </div>
          <p className="text-xs text-white/60">
            New entries are added to the end. Drag them in the list (or use ↑ ↓) to reorder.
          </p>
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            {activeLabel}
          </label>
          {rolePicker === 'presets' ? (
            <VisibleToPicker value={roles} onChange={setRoles} roleOptions={roleOptions} />
          ) : (
            <RoleAccessPicker
              value={roles}
              onChange={setRoles}
              hint="Leave empty to allow all authenticated roles."
            />
          )}
        </div>

        {errorMessage && <p className="mt-4 text-sm text-red-400">{errorMessage}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
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
