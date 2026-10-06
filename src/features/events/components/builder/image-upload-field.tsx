import { useRef, useState } from 'react';
import { Button, Label, Text } from '@shared/components';
import { isVideoFileUrl } from '../../utils/public-video';

interface ImageUploadFieldProps {
  label: string;
  /** Signed preview URL from the event (may be stale until reload). */
  currentUrl: string | null;
  /** Uploads the picked file and persists it; should refresh the event. */
  onUpload: (file: File) => Promise<void>;
  /** Clears the stored blob; should refresh the event. Omit to hide Remove. */
  onRemove?: () => Promise<void>;
  accept?: string;
  help?: string;
}

/**
 * Single-image (or short video) upload control for a BigEvent blob field.
 *
 * Shows the current signed preview (or an instant local preview of a freshly
 * picked file) and delegates the actual upload to `onUpload`. The parent is
 * responsible for refreshing the event so `currentUrl` reflects the new blob.
 */
export function ImageUploadField({
  label,
  currentUrl,
  onUpload,
  onRemove,
  accept = 'image/*',
  help,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  // Blob URLs carry no extension, so remember whether the picked file was a video.
  const [localIsVideo, setLocalIsVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = localPreview ?? currentUrl;
  const previewIsVideo = localPreview ? localIsVideo : isVideoFileUrl(currentUrl);

  const pick = () => inputRef.current?.click();

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setLocalPreview(URL.createObjectURL(file));
    setLocalIsVideo(file.type.startsWith('video/'));
    setUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (!onRemove || !window.confirm(`Remove the ${label.toLowerCase()}?`)) return;
    setError(null);
    setRemoving(true);
    try {
      await onRemove();
      setLocalPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed');
    } finally {
      setRemoving(false);
    }
  };

  const busy = uploading || removing;

  return (
    <div className="flex flex-col gap-1.5">
      <Label variant="form">{label}</Label>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
          {preview && previewIsVideo ? (
            <video src={preview} muted loop autoPlay playsInline className="h-full w-full object-cover" />
          ) : preview ? (
            <img src={preview} alt={label} className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs text-slate-400">No image</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={pick} disabled={busy}>
              {uploading ? 'Uploading…' : preview ? 'Replace' : 'Upload'}
            </Button>
            {onRemove && preview && (
              <Button type="button" variant="ghost" onClick={() => void remove()} disabled={busy}>
                {removing ? 'Removing…' : 'Remove'}
              </Button>
            )}
          </div>
          {help && (
            <Text variant="muted" className="text-xs">
              {help}
            </Text>
          )}
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          // Reset so re-picking the same file after Remove still fires onChange.
          e.target.value = '';
        }}
      />
    </div>
  );
}
