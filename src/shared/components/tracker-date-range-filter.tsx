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

  const applyCustom = () => {
    onChange({ preset: 'custom', ...customRange });
    setOpen(false);
  };

  const clear = () => {
    setPreset('all');
    setCustomRange({ startDate: '', endDate: '' });
    onChange({ preset: 'all', startDate: '', endDate: '' });
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={
          buttonClassName ||
          'inline-flex h-9 items-center rounded-md border border-white/15 bg-white/5 px-3 text-xs font-semibold text-white/85 hover:bg-white/10'
        }
        onClick={() => setOpen((prev) => !prev)}
      >
        {selectedLabel}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[280px] rounded-xl border border-white/15 bg-[#1b2433] p-2 text-white shadow-2xl backdrop-blur-sm">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search"
            className="mb-2 h-9 w-full rounded-md border border-white/15 bg-black/20 px-2 text-xs text-white/90 outline-none placeholder:text-white/45 focus:border-amber-300/60"
          />

          <div className="max-h-[220px] overflow-auto">
            {filteredPresets.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-white/10 ${
                  preset === item.key ? 'bg-white/10 font-semibold text-amber-200' : 'text-white/85'
                }`}
                onClick={() => applyPreset(item.key)}
              >
                <span>{item.label}</span>
                {preset === item.key ? <span className="text-amber-200">✓</span> : null}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
              <DateRangePicker
                value={customRange}
                onChange={setCustomRange}
                startLabel="From"
                endLabel="To"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="rounded border border-white/20 bg-white/5 px-2 py-1 text-xs text-white/85 hover:bg-white/10"
                  onClick={clear}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="rounded bg-amber-500/80 px-2 py-1 text-xs font-semibold text-black hover:bg-amber-400"
                  onClick={applyCustom}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
