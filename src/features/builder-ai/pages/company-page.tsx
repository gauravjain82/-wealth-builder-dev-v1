import { useState } from 'react';
import { Building2, CalendarDays, Users } from 'lucide-react';

import {
  TrackerDateRangeFilter,
  type DatePresetKey,
  type TrackerDateRangeChange,
} from '@/shared/components/tracker-date-range-filter';

import { MetricGoalCardGrid } from '../components/metric-goal-card';
import { RosterList } from '../components/roster-list';
import { useBuilderCompany } from '../hooks/use-builder-ai';
import type { BuilderRange } from '../services/builder-ai-service';

export default function BuilderCompanyPage() {
  const [preset, setPreset] = useState<DatePresetKey>('thisMonth');
  const [range, setRange] = useState<BuilderRange>({});
  const { data, isLoading, error } = useBuilderCompany(range);

  const handleRangeChange = (change: TrackerDateRangeChange) => {
    setPreset(change.preset);
    setRange({ startDate: change.startDate, endDate: change.endDate });
  };

  return (
    <div className="min-h-full space-y-5 bg-transparent p-0 text-[#1d1b1a] dark:text-white">
      <section className="relative z-10 overflow-visible rounded-[24px] border border-[#e8e1da] bg-gradient-to-br from-white via-[#faf8f5] to-[#fff6eb] p-5 shadow-[0_1px_3px_rgba(28,25,23,0.04),0_12px_36px_rgba(28,25,23,0.065)] dark:border-white/10 dark:from-[#1b1f29] dark:via-[#1d222c] dark:to-[#2a241e]">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[#f5a14b]/10 blur-3xl" />
        <div className="relative mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff8a1f] to-[#e94313] text-white shadow-[0_10px_22px_rgba(233,67,19,0.24)]">
              <Building2 size={23} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-[-0.03em]">Company</h1>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-[#817a74] dark:text-slate-400">
                <Users size={13} />
                {data?.owner_count ?? 0} company owners · {data?.builder_count ?? 0} total builders in scope
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[#e8dfd5] bg-white/80 p-1.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <CalendarDays className="ml-2 text-[#e94313]" size={17} />
            <TrackerDateRangeFilter value={preset} onChange={handleRangeChange} />
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
            Couldn’t load company data. Please try again.
          </div>
        ) : null}

        {isLoading || !data ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-36 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
            ))}
          </div>
        ) : (
          <MetricGoalCardGrid cards={data.cards} />
        )}
      </section>

      {!isLoading && data ? (
        <div>
          <RosterList members={data.members ?? []} scopeNoun="direct owner legs" />
        </div>
      ) : null}
    </div>
  );
}
