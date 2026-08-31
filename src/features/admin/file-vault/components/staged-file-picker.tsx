import { useRef } from 'react';
import { Button } from '@/shared/components';

type StagedFilePickerProps = {
  label: string;
  hint?: string;
  accept?: string;
  file: File | null;
  existingName?: string;
  onFileChange: (file: File | null) => void;
};

export function StagedFilePicker({
  label,
  hint,
  accept,
  file,
  existingName,
  onFileChange,
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
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          Choose file
        </Button>
        {file ? (
          <>
            <span className="text-sm text-white/80">{file.name}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => onFileChange(null)}>
              Remove
            </Button>
          </>
        ) : existingName ? (
          <span className="text-sm text-white/60">Current: {existingName}</span>
        ) : null}
      </div>
    </div>
  );
}
