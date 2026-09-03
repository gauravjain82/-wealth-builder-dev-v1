import { useRef, useState } from 'react';
import { Button, Label, Text } from '@shared/components';

interface ImageUploadFieldProps {
  label: string;
  /** Signed preview URL from the event (may be stale until reload). */
  currentUrl: string | null;
  /** Uploads the picked file and persists it; should refresh the event. */
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  help?: string;
}

/**
 * Single-image upload control for a BigEvent blob field.
 *
 * Shows the current signed preview (or an instant local preview of a freshly
 * picked file) and delegates the actual upload to `onUpload`. The parent is
 * responsible for refreshing the event so `currentUrl` reflects the new blob.
 */
export function ImageUploadField({
  label,
  currentUrl,
  onUpload,
  accept = 'image/*',
  help,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preview = localPreview ?? currentUrl;

  const pick = () => inputRef.current?.click();

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setLocalPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Label variant="form">{label}</Label>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
          {preview ? (
            <img src={preview} alt={label} className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs text-slate-400">No image</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Button type="button" variant="secondary" onClick={pick} disabled={uploading}>
            {uploading ? 'Uploading…' : preview ? 'Replace' : 'Upload'}
          </Button>
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
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
    </div>
  );
}
