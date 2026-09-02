import { useRef } from 'react';
import { Button } from '@/shared/components';

const LARGE_FILE_WARNING_BYTES = 50 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type StagedFilePickerProps = {
  label: string;
  hint?: string;
  accept?: string;
  file: File | null;
  existingName?: string;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
};

export function StagedFilePicker({
  label,
  hint,
  accept,
  file,
  existingName,
  onFileChange,
  disabled,
}: StagedFilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {hint && <p className="text-xs text-white/60">{hint}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          disabled={disabled}
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Choose file
        </Button>
        {file ? (
          <>
            <span className="text-sm text-white/80">
              {file.name} ({formatFileSize(file.size)})
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onFileChange(null)}
            >
              Remove
            </Button>
          </>
        ) : existingName ? (
          <span className="text-sm text-white/60">Current: {existingName}</span>
        ) : null}
      </div>
      {file && file.size >= LARGE_FILE_WARNING_BYTES && (
        <p className="text-xs text-amber-300">
          Large files often fail with HTTP 413 on the API proxy. For videos, prefer External
          link (Vimeo, Google Drive) instead of uploading the file through this form.
        </p>
      )}
    </div>
  );
}
