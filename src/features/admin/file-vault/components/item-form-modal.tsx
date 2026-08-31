import { useEffect, useState } from 'react';
import { Button, Input, Select } from '@/shared/components';
import type { FileVaultItemAdmin } from '@/features/file-vault/types';
import { uploadFileVaultItemFile } from '../services/file-vault-admin-service';
import { DeliveryModeSelector, type DeliveryMode } from './delivery-mode-selector';
import { RoleAccessPicker } from './role-access-picker';
import { StagedFilePicker } from './staged-file-picker';
import {
  existingDocumentLabel,
  existingThumbnailLabel,
  guessResourceTypeFromFile,
  inferDeliveryMode,
} from '../utils/delivery-mode';

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
    gcs_blob_name?: string;
    thumb_gcs_blob_name?: string;
    resource_type: string;
    sort_order: number;
    is_active: boolean;
    roles: string[];
  }) => Promise<FileVaultItemAdmin>;
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
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('link');
  const [title, setTitle] = useState('');
  const [href, setHref] = useState('');
  const [itemViewType, setItemViewType] = useState<'row' | 'card'>('card');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [resourceType, setResourceType] = useState('link');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [resolvedHref, setResolvedHref] = useState('');
  const [resolvedThumb, setResolvedThumb] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDeliveryMode(inferDeliveryMode(item));
    setTitle(item?.title ?? '');
    setHref(item?.href ?? '');
    setItemViewType(item?.item_view_type ?? 'card');
    setThumbnailUrl(item?.thumbnail_url ?? '');
    setResourceType(item?.resource_type ?? 'link');
    setSortOrder(item?.sort_order ?? 0);
    setIsActive(item?.is_active ?? true);
    setRoles(item?.allowed_roles ?? []);
    setDocumentFile(null);
    setThumbnailFile(null);
    setResolvedHref(item?.resolved_href ?? item?.href ?? '');
    setResolvedThumb(item?.resolved_thumb ?? item?.thumbnail_url ?? '');
  }, [open, item]);

  if (!open) return null;

  const handleDocumentFileChange = (file: File | null) => {
    setDocumentFile(file);
    if (file) {
      setResourceType(guessResourceTypeFromFile(file));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (deliveryMode === 'link' && !href.trim()) {
      alert('Enter a link URL or switch to Upload file.');
      return;
    }

    if (deliveryMode === 'upload' && !documentFile && !item?.gcs_blob_name) {
      alert('Choose a document file to upload.');
      return;
    }

    setSaving(true);
    try {
      const isLink = deliveryMode === 'link';
      const saved = await onSave({
        title: title.trim(),
        href: isLink ? href.trim() : '',
        item_view_type: itemViewType,
        thumbnail_url: isLink ? thumbnailUrl.trim() : '',
        gcs_blob_name: isLink ? '' : item?.gcs_blob_name ?? '',
        thumb_gcs_blob_name: isLink ? '' : item?.thumb_gcs_blob_name ?? '',
        resource_type: resourceType,
        sort_order: sortOrder,
        is_active: isActive,
        roles,
      });

      let nextHref = isLink ? href.trim() : resolvedHref;
      let nextThumb = isLink ? thumbnailUrl.trim() : resolvedThumb;

      if (deliveryMode === 'upload') {
        if (documentFile) {
          const upload = await uploadFileVaultItemFile(saved.id, documentFile, 'file');
          nextHref = upload.url;
          setResolvedHref(upload.url);
        }
        if (thumbnailFile) {
          const upload = await uploadFileVaultItemFile(saved.id, thumbnailFile, 'thumbnail');
          nextThumb = upload.url;
          setResolvedThumb(upload.url);
        } else if (!thumbnailFile && item?.resolved_thumb) {
          nextThumb = item.resolved_thumb;
        }
      }

      if (deliveryMode === 'link') {
        setResolvedHref(nextHref);
        setResolvedThumb(nextThumb);
      }

      onRefresh?.();
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

          <DeliveryModeSelector value={deliveryMode} onChange={setDeliveryMode} />

          {deliveryMode === 'link' ? (
            <>
              <div>
                <label className="mb-1 block text-sm text-white/70">Link URL</label>
                <Input
                  value={href}
                  onChange={(event) => setHref(event.target.value)}
                  placeholder="https://docs.google.com/..."
                  required
                />
              </div>
              {itemViewType === 'card' && (
                <div>
                  <label className="mb-1 block text-sm text-white/70">Thumbnail URL (optional)</label>
                  <Input
                    value={thumbnailUrl}
                    onChange={(event) => setThumbnailUrl(event.target.value)}
                    placeholder="https://..."
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <StagedFilePicker
                label="Document file"
                hint="Saved and linked automatically when you click Save."
                file={documentFile}
                existingName={existingDocumentLabel(item)}
                onFileChange={handleDocumentFileChange}
              />
              {itemViewType === 'card' && (
                <StagedFilePicker
                  label="Thumbnail image (optional)"
                  hint="Shown on the card in File Vault."
                  accept="image/*"
                  file={thumbnailFile}
                  existingName={existingThumbnailLabel(item)}
                  onFileChange={setThumbnailFile}
                />
              )}
              {(resolvedHref || item?.resolved_href) && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                  <p className="font-medium text-white/90">Linked file</p>
                  <p className="mt-1 break-all">{resolvedHref || item?.resolved_href}</p>
                </div>
              )}
            </>
          )}

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
