/** Company / Baseshop segment toggle used across the BuilderAI screens. */

import type { BuilderSegment } from '../services/builder-ai-service';

const OPTIONS: { key: BuilderSegment; label: string }[] = [
  { key: 'company', label: 'Company' },
  { key: 'baseshop', label: 'Baseshop' },
];

interface SegmentToggleProps {
  value: BuilderSegment;
  onChange: (value: BuilderSegment) => void;
}

export function SegmentToggle({ value, onChange }: SegmentToggleProps) {
  return (
    <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5 text-xs dark:bg-white/10">
      {OPTIONS.map((option) => (
        <button
          key={option.key}
          onClick={() => onChange(option.key)}
          className={`rounded-md px-3 py-1 ${
            value === option.key
              ? 'bg-white font-semibold text-amber-700 shadow-sm dark:bg-white/20'
              : 'text-gray-500'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
