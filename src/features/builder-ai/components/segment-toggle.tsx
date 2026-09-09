/** Company / Baseshop segment toggle used across the BuilderAI screens. */

import type { BuilderSegment } from '../services/builder-ai-service';

export interface SegmentOption {
  key: BuilderSegment;
  label: string;
}

const OPTIONS: SegmentOption[] = [
  { key: 'company', label: 'Company' },
  { key: 'baseshop', label: 'Baseshop' },
];

interface SegmentToggleProps {
  value: BuilderSegment;
  onChange: (value: BuilderSegment) => void;
  options?: SegmentOption[];
}

export function SegmentToggle({ value, onChange, options = OPTIONS }: SegmentToggleProps) {
  return (
    <div className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-white/80 bg-white/80 p-1 text-xs shadow-[0_4px_14px_rgba(28,25,23,0.06)] backdrop-blur dark:border-white/10 dark:bg-white/5">
      {options.map((option) => (
        <button
          key={option.key}
          onClick={() => onChange(option.key)}
          className={`whitespace-nowrap rounded-full px-4 py-2 font-medium transition-all duration-200 ${
            value === option.key
              ? 'bg-gradient-to-r from-[#ff8a1f] to-[#e94313] font-semibold text-white shadow-[0_6px_14px_rgba(233,67,19,0.24)]'
              : 'text-[#5d554f] hover:bg-[#fff7ee] dark:text-slate-300 dark:hover:bg-white/10'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
