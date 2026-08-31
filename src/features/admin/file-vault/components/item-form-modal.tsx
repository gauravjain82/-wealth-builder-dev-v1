import { useEffect, useState } from 'react';
import { Button, Input, Select } from '@/shared/components';
import type { FileVaultItemAdmin } from '@/features/file-vault/types';
import { FileUploadField } from './file-upload-field';
import { RoleAccessPicker } from './role-access-picker';

type ItemFormModalProps = {
  open: boolean;
  sectionId: number;
  item?: FileVaultItemAdmin | null;
  onClose: () => void;
  onSave: (payload: {
    title: string;
    href: string;
    item_view_type: 'row' | 'card';
    thumbnail_url: string;
    resource_type: string;
    sort_order: number;
    is_active: boolean;
    roles: string[];
  }) => Promise<FileVaultItemAdmin | void>;
  onRefresh?: () => void;
};

const RESOURCE_TYPES = ['link', 'video', 'pdf', 'doc', 'ppt', 'image'];

export function ItemFormModal({
  open,
  sectionId,
  item,
  onClose,
  onSave,
  onRefresh,
}: ItemFormModalProps) {
  const [title, setTitle] = useState('');
  const [href, setHref] = useState('');
  const [itemViewType, setItemViewType] = useState<'row' | 'card'>('card');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [resourceType, setResourceType] = useState('link');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedItemId, setSavedItemId] = useState<number | undefined>(item?.id);

  useEffect(() => {
    if (!open) return;
    setTitle(item?.title ?? '');
    setHref(item?.href ?? '');
    setItemViewType(item?.item_view_type ?? 'card');
    setThumbnailUrl(item?.thumbnail_url ?? '');
    setResourceType(item?.resource_type ?? 'link');
    setSortOrder(item?.sort_order ?? 0);
    setIsActive(item?.is_active ?? true);
    setRoles(item?.allowed_roles ?? []);
    setSavedItemId(item?.id);
  }, [open, item]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await onSave({
        title: title.trim(),
        href: href.trim(),
        item_view_type: itemViewType,
        thumbnail_url: thumbnailUrl.trim(),
        resource_type: resourceType,
        sort_order: sortOrder,
        is_active: isActive,
        roles,
      });
      if (result && 'id' in result) {
        setSavedItemId(result.id);
      }
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1d25] p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-white">
          {item ? 'Edit document' : 'Add document'}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-white/70">Title</label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/70">Link URL</label>
            <Input value={href} onChange={(event) => setHref(event.target.value)} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-white/70">View type</label>
              <Select
                value={itemViewType}
                onChange={(event) => setItemViewType(event.target.value as 'row' | 'card')}
              >
                <option value="card">Card</option>
                <option value="row">Row</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/70">Resource type</label>
              <Select
                value={resourceType}
                onChange={(event) => setResourceType(event.target.value)}
              >
                {RESOURCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <FileUploadField
            itemId={savedItemId}
            label="Thumbnail URL"
            uploadType="thumbnail"
            urlValue={thumbnailUrl}
            onUrlChange={setThumbnailUrl}
            onUploaded={onRefresh}
          />
          <FileUploadField
            itemId={savedItemId}
            label="Document file"
            uploadType="file"
            onUploaded={onRefresh}
          />
          <div>
            <label className="mb-1 block text-sm text-white/70">Sort order</label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(event) => setSortOrder(Number(event.target.value))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Active
          </label>
          <RoleAccessPicker value={roles} onChange={setRoles} />
        </div>

        <input type="hidden" value={sectionId} readOnly />

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
