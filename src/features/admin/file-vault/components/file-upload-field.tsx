import { useRef } from 'react';
import { Button, Input } from '@/shared/components';
import { uploadFileVaultItemFile } from '../services/file-vault-admin-service';

type FileUploadFieldProps = {
  itemId?: number;
  label: string;
  uploadType?: 'file' | 'thumbnail';
  urlValue?: string;
  onUrlChange?: (value: string) => void;
  onUploaded?: () => void;
};

export function FileUploadField({
  itemId,
  label,
  uploadType = 'file',
  urlValue = '',
  onUrlChange,
  onUploaded,
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !itemId) return;

    try {
      await uploadFileVaultItemFile(itemId, file, uploadType);
      onUploaded?.();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-900 dark:text-white">{label}</label>
      {onUrlChange && (
        <Input
          value={urlValue}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder="https://..."
        />
      )}
      {itemId ? (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(event) => void handleUpload(event)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            Upload {uploadType === 'thumbnail' ? 'thumbnail' : 'file'}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-slate-500 dark:text-white/60">
          Save the item first to enable file upload.
        </p>
      )}
    </div>
  );
}
