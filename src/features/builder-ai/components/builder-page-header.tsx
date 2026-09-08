import type { ReactNode } from 'react';
import { BarChart3, CalendarDays, Store, Trophy } from 'lucide-react';

import {
  TrackerDateRangeFilter,
  type DatePresetKey,
  type TrackerDateRangeChange,
} from '@/shared/components/tracker-date-range-filter';

const ICONS = { baseshop: Store, reporting: BarChart3, bulletin: Trophy };

interface BuilderPageHeaderProps {
  title: string;
  description: string;
  icon: keyof typeof ICONS;
  preset: DatePresetKey;
  onRangeChange: (change: TrackerDateRangeChange) => void;
  controls?: ReactNode;
  children?: ReactNode;
}

export function BuilderPageHeader({ title, description, icon, preset, onRangeChange, controls, children }: BuilderPageHeaderProps) {
  const Icon = ICONS[icon];
  return (
    <section className="relative z-20 overflow-visible rounded-[24px] border border-[#e8e1da] bg-gradient-to-br from-white via-[#faf8f5] to-[#fff6eb] p-5 shadow-[0_1px_3px_rgba(28,25,23,0.04),0_12px_36px_rgba(28,25,23,0.065)] dark:border-white/10 dark:from-[#1b1f29] dark:via-[#1d222c] dark:to-[#2a241e]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff8a1f] to-[#e94313] text-white shadow-[0_6px_18px_rgba(233,67,19,0.2)]"><Icon size={23} /></div>
          <div className="min-w-0"><h1 className="truncate text-2xl font-bold tracking-[-0.03em] text-[#1d1b1a] dark:text-white">{title}</h1><p className="mt-1 text-xs text-[#817a74] dark:text-slate-400">{description}</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {controls}
          <div className="flex items-center gap-2 rounded-xl border border-[#e8dfd5] bg-white/80 p-1.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5"><CalendarDays className="ml-2 text-[#e94313]" size={17} /><TrackerDateRangeFilter value={preset} onChange={onRangeChange} /></div>
        </div>
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}
