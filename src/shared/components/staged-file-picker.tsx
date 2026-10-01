import { useRef } from 'react';
import { Button } from './ui/button';

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
  /** A validation message shown under the picker. */
  error?: string;
  /** Warn (without blocking) once the staged file reaches `bytes`. */
  largeFileWarning?: { bytes: number; message: string };
};

/**
 * Holds a chosen file in form state until the caller submits it. Lifted from
 * `admin/content-pages` (decision AD3 in `docs/admin/PHASES.md`) so plug-in fees can
 * reuse it; the content-pages large-upload warning is now passed in by that caller.
 */
export function StagedFilePicker({
  label,
  hint,
  accept,
  file,
  existingName,
  onFileChange,
  disabled,
  error,
  largeFileWarning,
}: StagedFilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
        {hint && <p className="text-xs text-slate-500 dark:text-white/60">{hint}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          disabled={disabled}
          onChange={(event) => {
            onFileChange(event.target.files?.[0] ?? null);
            // Allow re-choosing the same file after a Remove.
            event.target.value = '';
          }}
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
            <span className="text-sm text-slate-700 dark:text-white/80">
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
          <span className="text-sm text-slate-500 dark:text-white/60">Current: {existingName}</span>
        ) : null}
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-300">{error}</p>}
      {file && largeFileWarning && file.size >= largeFileWarning.bytes && (
        <p className="text-xs text-amber-600 dark:text-amber-300">{largeFileWarning.message}</p>
      )}
    </div>
  );
}
