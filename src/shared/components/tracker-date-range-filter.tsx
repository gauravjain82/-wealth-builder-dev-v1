import { useEffect, useMemo, useRef, useState } from 'react';
import { DateRangePicker, type DateRangeValue } from './ui/date-picker';

export type DatePresetKey = 'all' | 'thisMonth' | 'lastMonth' | 'last3Months' | 'last6Months' | 'ytd' | 'custom';

interface DatePresetOption {
  key: DatePresetKey;
  label: string;
}

export interface TrackerDateRangeChange {
  preset: DatePresetKey;
  startDate: string;
  endDate: string;
}

interface TrackerDateRangeFilterProps {
  onChange: (value: TrackerDateRangeChange) => void;
  value?: DatePresetKey;
  selectedRange?: DateRangeValue;
  buttonClassName?: string;
}

const PRESETS: DatePresetOption[] = [
  { key: 'all', label: 'All Ranges' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'last3Months', label: 'Last 3 Months' },
  { key: 'last6Months', label: 'Last 6 Months' },
  { key: 'ytd', label: 'YTD' },
  { key: 'custom', label: 'Custom' },
];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toDateString(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function startOfMonth(base: Date): Date {
  return new Date(base.getFullYear(), base.getMonth(), 1);
}

function endOfMonth(base: Date): Date {
  return new Date(base.getFullYear(), base.getMonth() + 1, 0);
}

function addMonths(base: Date, months: number): Date {
  return new Date(base.getFullYear(), base.getMonth() + months, base.getDate());
}

function resolvePresetRange(preset: DatePresetKey): DateRangeValue {
  const today = new Date();

  if (preset === 'all') {
    return { startDate: '', endDate: '' };
  }

  if (preset === 'thisMonth') {
    return {
      startDate: toDateString(startOfMonth(today)),
      endDate: toDateString(today),
    };
  }

  if (preset === 'lastMonth') {
    const lastMonth = addMonths(today, -1);
    return {
      startDate: toDateString(startOfMonth(lastMonth)),
      endDate: toDateString(endOfMonth(lastMonth)),
    };
  }

  if (preset === 'last3Months') {
    return {
      startDate: toDateString(startOfMonth(addMonths(today, -2))),
      endDate: toDateString(today),
    };
  }

  if (preset === 'last6Months') {
    return {
      startDate: toDateString(startOfMonth(addMonths(today, -5))),
      endDate: toDateString(today),
    };
  }

  if (preset === 'ytd') {
    return {
      startDate: toDateString(new Date(today.getFullYear(), 0, 1)),
      endDate: toDateString(today),
    };
  }

  return { startDate: '', endDate: '' };
}

export function TrackerDateRangeFilter({
  onChange,
  value = 'all',
  selectedRange,
  buttonClassName,
}: TrackerDateRangeFilterProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [preset, setPreset] = useState<DatePresetKey>(value);
  const [customRange, setCustomRange] = useState<DateRangeValue>({ startDate: '', endDate: '' });

  useEffect(() => {
    setPreset(value);
  }, [value]);

  useEffect(() => {
    if (value !== 'custom') return;
    if (!selectedRange) return;
    if (!selectedRange.startDate && !selectedRange.endDate) return;
    setCustomRange(selectedRange);
  }, [selectedRange, value]);

  useEffect(() => {
    const onWindowClick = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };

    window.addEventListener('mousedown', onWindowClick);
    return () => window.removeEventListener('mousedown', onWindowClick);
  }, []);

  const filteredPresets = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return PRESETS;
    return PRESETS.filter((item) => item.label.toLowerCase().includes(normalized));
  }, [searchTerm]);

  const selectedLabel = PRESETS.find((item) => item.key === preset)?.label || 'All Ranges';

  const applyPreset = (nextPreset: DatePresetKey) => {
    setPreset(nextPreset);
    if (nextPreset === 'custom') return;
    const range = resolvePresetRange(nextPreset);
    onChange({ preset: nextPreset, ...range });
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={
          buttonClassName ||
          'inline-flex h-9 items-center rounded-md border border-gray-300 bg-gray-100 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-200 dark:border-white/15 dark:bg-white/5 dark:text-white/85 dark:hover:bg-white/10'
        }
        onClick={() => setOpen((prev) => !prev)}
      >
        {selectedLabel}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[280px] rounded-xl border border-gray-200 bg-white p-2 text-gray-800 shadow-2xl backdrop-blur-sm dark:border-white/15 dark:bg-[#1b2433] dark:text-white">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search"
            className="mb-2 h-9 w-full rounded-md border border-gray-300 bg-gray-50 px-2 text-xs text-gray-800 outline-none placeholder:text-gray-400 focus:border-amber-500/60 dark:border-white/15 dark:bg-black/20 dark:text-white/90 dark:placeholder:text-white/45 dark:focus:border-amber-300/60"
          />

          <div className="max-h-[220px] overflow-auto">
            {filteredPresets.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/10 ${
                  preset === item.key ? 'bg-gray-100 font-semibold text-amber-700 dark:bg-white/10 dark:text-amber-200' : 'text-gray-700 dark:text-white/85'
                }`}
                onClick={() => applyPreset(item.key)}
              >
                <span>{item.label}</span>
                {preset === item.key ? <span className="text-amber-700 dark:text-amber-200">✓</span> : null}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="mt-2 space-y-2 border-t border-gray-200 pt-2 dark:border-white/10">
              <DateRangePicker
                value={customRange}
                onChange={(nextRange) => {
                  setCustomRange(nextRange);
                  if (!nextRange.startDate && !nextRange.endDate) {
                    setPreset('all');
                    onChange({ preset: 'all', startDate: '', endDate: '' });
                    return;
                  }
                  if (nextRange.startDate && nextRange.endDate) {
                    setPreset('custom');
                    onChange({ preset: 'custom', ...nextRange });
                    setOpen(false);
                  }
                }}
                startLabel="From"
                endLabel="To"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
