import type { DeliveryMode } from '../utils/delivery-mode';

type DeliveryModeSelectorProps = {
  value: DeliveryMode;
  onChange: (mode: DeliveryMode) => void;
  disabled?: boolean;
  prompt?: string;
};

export function DeliveryModeSelector({
  value,
  onChange,
  disabled,
  prompt = 'How should users access this document?',
}: DeliveryModeSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-white">{prompt}</p>
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            { id: 'link' as const, label: 'External link', hint: 'Google Drive, Vimeo, etc.' },
            { id: 'upload' as const, label: 'Upload file', hint: 'PDF, image, or document' },
          ] as const
        ).map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.id)}
              className={`rounded-xl border p-3 text-left transition ${
                selected
                  ? 'border-amber-400 bg-amber-400/10'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <p className="text-sm font-medium text-white">{option.label}</p>
              <p className="text-xs text-white/60">{option.hint}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
