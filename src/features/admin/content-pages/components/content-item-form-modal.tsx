import { useEffect, useRef, useState } from 'react';
import { Button, Input, Select } from '@/shared/components';
import { DeliveryModeSelector } from './delivery-mode-selector';
import { RoleAccessPicker } from './role-access-picker';
import { SchemaField } from './schema-field';
import { StagedFilePicker } from './staged-file-picker';
import {
  existingDocumentLabel,
  existingThumbnailLabel,
  guessResourceTypeFromFile,
  inferDeliveryMode,
  isPdfLike,
  type DeliveryMode,
} from '../utils/delivery-mode';
import {
  defaultFieldValue,
  type ContentFieldSchema,
  type ContentItemAdmin,
  type ContentItemFormPayload,
  type ContentUploadResult,
  type FieldValue,
} from '../types';

const DEFAULT_RESOURCE_TYPES = ['link', 'video', 'pdf', 'doc', 'ppt', 'image'];

type ContentItemFormModalProps<TItem extends ContentItemAdmin> = {
  open: boolean;
  sectionId: number;
  item?: TItem | null;
  onClose: () => void;
  onSave: (payload: ContentItemFormPayload) => Promise<TItem>;
  uploadFile: (
    id: number,
    file: File,
    uploadType: 'file' | 'thumbnail'
  ) => Promise<ContentUploadResult>;
  onRefresh?: () => void;
  onSaved?: (item: TItem, action: 'created' | 'updated') => void;
  /** Page-specific fields, e.g. `xp` for Training Center or `item_view_type` for File Vault. */
  fields?: ContentFieldSchema[];
  /** Hide thumbnail inputs when a page-specific field says they don't apply. */
  showThumbnail?: (extras: Record<string, FieldValue>) => boolean;
  resourceTypes?: string[];
  nounSingular?: string;
  deliveryPrompt?: string;
};

export function ContentItemFormModal<TItem extends ContentItemAdmin>({
  open,
  sectionId,
  item,
  onClose,
  onSave,
  uploadFile,
  onRefresh,
  onSaved,
  fields = [],
  showThumbnail,
  resourceTypes = DEFAULT_RESOURCE_TYPES,
  nounSingular = 'document',
  deliveryPrompt,
}: ContentItemFormModalProps<TItem>) {
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('link');
  const [title, setTitle] = useState('');
  const [href, setHref] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [resourceType, setResourceType] = useState('link');
  const [allowDownload, setAllowDownload] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [extras, setExtras] = useState<Record<string, FieldValue>>({});
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [resolvedThumb, setResolvedThumb] = useState('');
  const [persistedId, setPersistedId] = useState<number | null>(null);
  const [savePhase, setSavePhase] = useState<'idle' | 'saving' | 'uploading'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setDeliveryMode(inferDeliveryMode(item));
    setTitle(item?.title ?? '');
    setHref(item?.href ?? '');
    setThumbnailUrl(item?.thumbnail_url ?? '');
    setResourceType(item?.resource_type ?? 'link');
    setAllowDownload(item?.allow_download ?? false);
    setIsActive(item?.is_active ?? true);
    setRoles(item?.allowed_roles ?? []);
    setDocumentFile(null);
    setThumbnailFile(null);
    setResolvedThumb(item?.resolved_thumb ?? item?.thumbnail_url ?? '');
    setPersistedId(item?.id ?? null);
    setSavePhase('idle');
    inFlightRef.current = false;
    setErrorMessage('');

    const record = item as unknown as Record<string, FieldValue> | null | undefined;
    setExtras(
      Object.fromEntries(
        fields.map((field) => {
          const current = record?.[field.name];
          return [
            field.name,
            current === undefined || current === null
              ? defaultFieldValue(field)
              : current,
          ];
        })
      )
    );
    // `fields` is a stable module-level constant per page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item]);

  if (!open) return null;

  const busy = savePhase !== 'idle';
  const thumbnailVisible = showThumbnail ? showThumbnail(extras) : true;

  const handleExtraChange = (name: string, value: FieldValue) => {
    setExtras((current) => ({ ...current, [name]: value }));
  };

  const handleDocumentFileChange = (file: File | null) => {
    setDocumentFile(file);
    if (file) setResourceType(guessResourceTypeFromFile(file));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inFlightRef.current) return;
    setErrorMessage('');

    if (deliveryMode === 'link' && !href.trim()) {
      setErrorMessage('Enter a link URL or switch to Upload file.');
      return;
    }
    if (deliveryMode === 'upload' && !documentFile && !item?.gcs_blob_name) {
      setErrorMessage('Choose a file to upload.');
      return;
    }

    const wasCreate = !item?.id && !persistedId;
    const pendingUploads =
      deliveryMode === 'upload' && Boolean(documentFile || thumbnailFile);
    const keepExistingBlob = Boolean(persistedId || item?.id);

    inFlightRef.current = true;
    setSavePhase('saving');
    try {
      const isLink = deliveryMode === 'link';
      const saved = await onSave({
        ...extras,
        ...(persistedId ? { id: persistedId } : {}),
        title: title.trim(),
        href: isLink ? href.trim() : '',
        thumbnail_url: isLink && thumbnailVisible ? thumbnailUrl.trim() : '',
        gcs_blob_name: isLink ? '' : keepExistingBlob ? (item?.gcs_blob_name ?? '') : '',
        thumb_gcs_blob_name: isLink
          ? ''
          : keepExistingBlob
            ? (item?.thumb_gcs_blob_name ?? '')
            : '',
        resource_type: resourceType,
        allow_download: allowDownload,
        is_active: isActive,
        roles,
      });
      setPersistedId(saved.id);

      if (pendingUploads) {
        setSavePhase('uploading');
        if (documentFile) {
          await uploadFile(saved.id, documentFile, 'file');
        }
        if (thumbnailFile) {
          const upload = await uploadFile(saved.id, thumbnailFile, 'thumbnail');
          setResolvedThumb(upload.item.resolved_thumb ?? upload.url);
        }
      }

      onSaved?.(saved, wasCreate ? 'created' : 'updated');
      onRefresh?.();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : `Failed to save ${nounSingular}`
      );
    } finally {
      inFlightRef.current = false;
      setSavePhase('idle');
    }
  };

  const pdfLike = isPdfLike(resourceType, documentFile, item?.gcs_blob_name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1d25] p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-white">
          {item ? `Edit ${nounSingular}` : `Add ${nounSingular}`}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-white/70">Title</label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              disabled={busy}
            />
          </div>

          <DeliveryModeSelector
            value={deliveryMode}
            onChange={setDeliveryMode}
            disabled={busy}
            prompt={deliveryPrompt}
          />

          {deliveryMode === 'link' ? (
            <>
              <div>
                <label className="mb-1 block text-sm text-white/70">Link URL</label>
                <Input
                  value={href}
                  onChange={(event) => setHref(event.target.value)}
                  placeholder="https://docs.google.com/..."
                  required
                  disabled={busy}
                />
              </div>
              {thumbnailVisible && (
                <div>
                  <label className="mb-1 block text-sm text-white/70">
                    Thumbnail URL (optional)
                  </label>
                  <Input
                    value={thumbnailUrl}
                    onChange={(event) => setThumbnailUrl(event.target.value)}
                    placeholder="https://..."
                    disabled={busy}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <StagedFilePicker
                label="File"
                hint="Saved and linked automatically when you click Save. Keep this window open until the upload finishes."
                file={documentFile}
                existingName={existingDocumentLabel(item)}
                onFileChange={handleDocumentFileChange}
                disabled={busy}
              />
              {thumbnailVisible && (
                <StagedFilePicker
                  label="Thumbnail image (optional)"
                  hint="Shown on the card."
                  accept="image/*"
                  file={thumbnailFile}
                  existingName={existingThumbnailLabel(item)}
                  onFileChange={setThumbnailFile}
                  disabled={busy}
                />
              )}
              {(item?.gcs_blob_name || documentFile) && (
                <p className="text-xs text-white/60">
                  The file location is stored. A fresh download link is generated each time
                  someone opens it.
                </p>
              )}
              {resolvedThumb && thumbnailVisible && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                  <p className="font-medium text-white/90">Thumbnail preview</p>
                  <img src={resolvedThumb} alt="" className="mt-2 h-16 w-24 rounded object-cover" />
                </div>
              )}
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-white/70">Resource type</label>
              <Select
                value={resourceType}
                onChange={(event) => setResourceType(event.target.value)}
                disabled={busy}
              >
                {resourceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </div>
            {fields.map((field) => (
              <SchemaField
                key={field.name}
                field={field}
                value={extras[field.name] ?? defaultFieldValue(field)}
                onChange={handleExtraChange}
                disabled={busy}
              />
            ))}
          </div>

          <p className="text-xs text-white/60">
            New entries are added to the end of this section. Use the ↑ ↓ buttons to reorder.
          </p>

          {pdfLike && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <label className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={allowDownload}
                  onChange={(event) => setAllowDownload(event.target.checked)}
                  disabled={busy}
                />
                Allow download
              </label>
              <p className="mt-1 text-xs text-white/50">
                Off by default. When off, the PDF opens in a view-only viewer.
              </p>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              disabled={busy}
            />
            Active
          </label>

          <RoleAccessPicker value={roles} onChange={setRoles} disabled={busy} />
        </div>

        <input type="hidden" value={sectionId} readOnly />

        {errorMessage && <p className="mt-4 text-sm text-red-400">{errorMessage}</p>}
        {savePhase === 'uploading' && (
          <p className="mt-4 text-sm text-amber-300">
            Uploading to cloud storage. This can take a moment for larger files. Please wait
            until it finishes before leaving this page.
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {savePhase === 'uploading'
              ? 'Uploading...'
              : savePhase === 'saving'
                ? 'Saving...'
                : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  );
}
