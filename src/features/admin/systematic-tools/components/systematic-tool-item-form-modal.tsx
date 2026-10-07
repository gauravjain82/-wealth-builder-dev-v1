import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, StagedFilePicker } from '@/shared/components';
import { toEmbeddableSlidesUrl } from '@/features/systematic-tools/components/fullscreen-viewer';
import type { SystematicToolItemAdmin } from '@/features/systematic-tools/types';
import type { ContentItemFormModalProps } from '@/features/admin/content-pages/components/content-item-form-modal';
import { DeliveryModeSelector } from '@/features/admin/content-pages/components/delivery-mode-selector';
import { VisibleToPicker } from '@/features/admin/content-pages/components/visible-to-picker';
import type { RoleOption } from '@/features/admin/content-pages/types';
import {
  existingDocumentLabel,
  existingThumbnailLabel,
  type DeliveryMode,
} from '@/features/admin/content-pages/utils/delivery-mode';
import {
  ITEM_KIND_OPTIONS,
  inferItemKind,
  isGoogleSlidesUrl,
  itemKindOption,
  type ItemKind,
} from '../utils/item-kind';

const LARGE_FILE_WARNING = {
  bytes: 50 * 1024 * 1024,
  message: 'Large files often fail with HTTP 413 on the API proxy. Paste a link instead if the upload fails.',
};

const isWebUrl = (value: string) => /^https?:\/\/\S+$/i.test(value.trim());

type SystematicToolItemFormModalProps = ContentItemFormModalProps<SystematicToolItemAdmin> & {
  roleOptions?: RoleOption[];
};

/**
 * Content form for a tool. It asks what a click should do first, then shows
 * only the fields that choice needs.
 */
export function SystematicToolItemFormModal({
  open,
  item,
  onClose,
  onSave,
  uploadFile,
  onRefresh,
  onSaved,
  roleOptions,
}: SystematicToolItemFormModalProps) {
  const [kind, setKind] = useState<ItemKind>('slides');
  const [title, setTitle] = useState('');
  const [href, setHref] = useState('');
  const [pdfMode, setPdfMode] = useState<DeliveryMode>('upload');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [allowDownload, setAllowDownload] = useState(false);
  const [thumbMode, setThumbMode] = useState<DeliveryMode>('link');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbFilePreview, setThumbFilePreview] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [persistedId, setPersistedId] = useState<number | null>(null);
  const [savePhase, setSavePhase] = useState<'idle' | 'saving' | 'uploading'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const initialKind = item ? inferItemKind(item) : 'slides';
    setKind(initialKind);
    setTitle(item?.title ?? '');
    setHref(item?.href ?? '');
    setPdfMode(item ? (item.gcs_blob_name ? 'upload' : 'link') : 'upload');
    setDocumentFile(null);
    setAllowDownload(item?.allow_download ?? false);
    setThumbMode(item?.thumb_gcs_blob_name ? 'upload' : 'link');
    setThumbnailUrl(item?.thumbnail_url ?? '');
    setThumbnailFile(null);
    setIsActive(item?.is_active ?? true);
    setRoles(item?.allowed_roles ?? []);
    setPersistedId(item?.id ?? null);
    setSavePhase('idle');
    inFlightRef.current = false;
    setErrorMessage('');
  }, [open, item]);

  // Local preview of a staged thumbnail; revoked when it changes or closes.
  useEffect(() => {
    if (!thumbnailFile) {
      setThumbFilePreview('');
      return undefined;
    }
    const url = URL.createObjectURL(thumbnailFile);
    setThumbFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  const thumbPreview = useMemo(() => {
    if (thumbMode === 'upload') {
      return thumbFilePreview || (item?.thumb_gcs_blob_name ? (item.resolved_thumb ?? '') : '');
    }
    const value = thumbnailUrl.trim();
    return isWebUrl(value) || value.startsWith('/') ? value : '';
  }, [thumbMode, thumbFilePreview, thumbnailUrl, item]);

  if (!open) return null;

  const busy = savePhase !== 'idle';
  const option = itemKindOption(kind);
  const pdfUpload = kind === 'pdf' && pdfMode === 'upload';

  /** Validate the click target and return the href to store, or an error. */
  const resolveHref = (): { href: string } | { error: string } => {
    const value = href.trim();
    switch (kind) {
      case 'slides':
        if (!value) return { error: 'Paste the Google Slides link.' };
        if (!isGoogleSlidesUrl(value)) {
          return {
            error:
              'That is not a Google Slides link. It should start with https://docs.google.com/presentation/d/…',
          };
        }
        return { href: toEmbeddableSlidesUrl(value) };
      case 'pdf':
        if (pdfMode === 'upload') {
          if (!documentFile && !item?.gcs_blob_name) return { error: 'Choose a PDF to upload.' };
          return { href: '' };
        }
        if (!isWebUrl(value)) return { error: 'Paste the PDF link (starting with https://).' };
        return { href: value };
      case 'link':
        if (!isWebUrl(value) && !value.startsWith('/')) {
          return { error: 'Paste the link (starting with https://).' };
        }
        return { href: value };
      default:
        return { href: '' };
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inFlightRef.current) return;
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Enter a title.');
      return;
    }
    const target = resolveHref();
    if ('error' in target) {
      setErrorMessage(target.error);
      return;
    }
    if (thumbMode === 'link' && thumbnailUrl.trim() && !isWebUrl(thumbnailUrl)) {
      setErrorMessage('The thumbnail link should start with https://.');
      return;
    }

    const wasCreate = !item?.id && !persistedId;
    const keepExisting = Boolean(persistedId || item?.id);

    inFlightRef.current = true;
    setSavePhase('saving');
    try {
      const saved = await onSave({
        ...(persistedId ? { id: persistedId } : {}),
        title: title.trim(),
        action: option.action,
        resource_type: option.resourceType,
        href: target.href,
        // Clearing a blob name switches the item back to its pasted link.
        gcs_blob_name: pdfUpload && keepExisting ? (item?.gcs_blob_name ?? '') : '',
        thumbnail_url: thumbMode === 'link' ? thumbnailUrl.trim() : '',
        thumb_gcs_blob_name:
          thumbMode === 'upload' && keepExisting ? (item?.thumb_gcs_blob_name ?? '') : '',
        allow_download: kind === 'pdf' ? allowDownload : false,
        is_active: isActive,
        roles,
      });
      setPersistedId(saved.id);

      const pendingDocument = pdfUpload ? documentFile : null;
      const pendingThumb = thumbMode === 'upload' ? thumbnailFile : null;
      if (pendingDocument || pendingThumb) {
        setSavePhase('uploading');
        if (pendingDocument) await uploadFile(saved.id, pendingDocument, 'file');
        if (pendingThumb) await uploadFile(saved.id, pendingThumb, 'thumbnail');
      }

      onSaved?.(saved, wasCreate ? 'created' : 'updated');
      onRefresh?.();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save content');
    } finally {
      inFlightRef.current = false;
      setSavePhase('idle');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1d25] p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-white">
          {item ? 'Edit content' : 'Add content'}
        </h2>

        <div className="space-y-5">
          <fieldset className="space-y-2" disabled={busy}>
            <legend className="text-sm font-medium text-white">
              1. What should happen when someone clicks it?
            </legend>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
              {ITEM_KIND_OPTIONS.map((entry) => {
                const selected = entry.kind === kind;
                return (
                  <button
                    key={entry.kind}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setKind(entry.kind);
                      setErrorMessage('');
                    }}
                    className={`rounded-xl border p-3 text-left transition ${
                      selected
                        ? 'border-amber-400 bg-amber-400/10'
                        : 'border-white/10 hover:border-white/25'
                    }`}
                  >
                    <p className="text-sm font-medium text-white">{entry.label}</p>
                    <p className="text-xs text-white/60">{entry.hint}</p>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {kind === 'slides' && (
            <div>
              <label className="mb-1 block text-sm text-white/70" htmlFor="st-slides-url">
                Google Slides link
              </label>
              <Input
                id="st-slides-url"
                value={href}
                onChange={(event) => setHref(event.target.value)}
                placeholder="https://docs.google.com/presentation/d/…"
                disabled={busy}
              />
              <p className="mt-1 text-xs text-white/50">
                Any share, publish or embed link works. The deck must be shared as “Anyone with the
                link”.
              </p>
            </div>
          )}

          {kind === 'pdf' && (
            <div className="space-y-3">
              <DeliveryModeSelector
                value={pdfMode}
                onChange={setPdfMode}
                disabled={busy}
                prompt="Where is the PDF?"
                linkHint="A link to a PDF (Firebase, Google Drive, …)"
                uploadHint="Upload a PDF file"
              />
              {pdfMode === 'upload' ? (
                <StagedFilePicker
                  label="PDF file"
                  accept="application/pdf,.pdf"
                  largeFileWarning={LARGE_FILE_WARNING}
                  hint="Uploaded when you click Save. Keep this window open until it finishes."
                  file={documentFile}
                  existingName={existingDocumentLabel(item)}
                  onFileChange={setDocumentFile}
                  disabled={busy}
                />
              ) : (
                <div>
                  <label className="mb-1 block text-sm text-white/70" htmlFor="st-pdf-url">
                    PDF link
                  </label>
                  <Input
                    id="st-pdf-url"
                    value={href}
                    onChange={(event) => setHref(event.target.value)}
                    placeholder="https://…/file.pdf"
                    disabled={busy}
                  />
                </div>
              )}
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
            </div>
          )}

          {kind === 'link' && (
            <div>
              <label className="mb-1 block text-sm text-white/70" htmlFor="st-link-url">
                Link
              </label>
              <Input
                id="st-link-url"
                value={href}
                onChange={(event) => setHref(event.target.value)}
                placeholder="https://…"
                disabled={busy}
              />
            </div>
          )}

          {!['slides', 'pdf', 'link'].includes(kind) && (
            <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/60">
              No link needed. {option.hint}
            </p>
          )}

          <div className="space-y-4 border-t border-white/10 pt-4">
            <p className="text-sm font-medium text-white">2. How it looks and who sees it</p>

            <div>
              <label className="mb-1 block text-sm text-white/70" htmlFor="st-title">
                Title
              </label>
              <Input
                id="st-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Presentation"
                disabled={busy}
                required
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm text-white/70">Thumbnail (optional)</p>
              <div className="flex gap-2">
                {(
                  [
                    { id: 'link' as const, label: 'Paste image link' },
                    { id: 'upload' as const, label: 'Upload image' },
                  ] as const
                ).map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    disabled={busy}
                    aria-pressed={thumbMode === entry.id}
                    onClick={() => setThumbMode(entry.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      thumbMode === entry.id
                        ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                        : 'border-white/20 text-white/70 hover:border-white/40'
                    }`}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex-1">
                  {thumbMode === 'link' ? (
                    <Input
                      value={thumbnailUrl}
                      onChange={(event) => setThumbnailUrl(event.target.value)}
                      placeholder="https://…/thumbnail.png"
                      aria-label="Thumbnail image link"
                      disabled={busy}
                    />
                  ) : (
                    <StagedFilePicker
                      label="Thumbnail image"
                      accept="image/*"
                      largeFileWarning={LARGE_FILE_WARNING}
                      file={thumbnailFile}
                      existingName={existingThumbnailLabel(item)}
                      onFileChange={setThumbnailFile}
                      disabled={busy}
                    />
                  )}
                  <p className="mt-1 text-xs text-white/50">
                    Without a thumbnail the content shows as a plain row.
                  </p>
                </div>
                <div className="flex aspect-video w-40 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/5">
                  {thumbPreview ? (
                    <img src={thumbPreview} alt="Thumbnail preview" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs text-white/40">No preview</span>
                  )}
                </div>
              </div>
            </div>

            <VisibleToPicker
              value={roles}
              onChange={setRoles}
              roleOptions={roleOptions}
              disabled={busy}
              note="Content is only visible if its tool is visible too."
            />

            <label className="flex items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                disabled={busy}
              />
              Shown on page
              <span className="text-xs text-white/50">(untick to hide it without deleting)</span>
            </label>
          </div>
        </div>

        {errorMessage && <p className="mt-4 text-sm text-red-400">{errorMessage}</p>}
        {savePhase === 'uploading' && (
          <p className="mt-4 text-sm text-amber-300">
            Uploading to cloud storage. Please wait until it finishes before leaving this page.
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {savePhase === 'uploading' ? 'Uploading...' : savePhase === 'saving' ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  );
}
