import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, CalendarDays, Users } from 'lucide-react';

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
  const { ownerId } = useParams<{ ownerId?: string }>();
  const isOwnerView = Boolean(ownerId);
  const navigate = useNavigate();
  const [preset, setPreset] = useState<DatePresetKey>('thisMonth');
  const [range, setRange] = useState<BuilderRange>({});
  const { data, isLoading, error } = useBuilderCompany(range, ownerId);

  const handleRangeChange = (change: TrackerDateRangeChange) => {
    setPreset(change.preset);
    setRange({ startDate: change.startDate, endDate: change.endDate });
  };

  // Drilled-in owner views use a neutral slate palette so it's clear you're
  // looking at someone else's company rather than your own (warm orange) page.
  const sectionClass = isOwnerView
    ? 'relative z-10 overflow-visible rounded-[24px] border border-slate-200 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-5 shadow-[0_1px_3px_rgba(28,25,23,0.04),0_12px_36px_rgba(28,25,23,0.065)] dark:border-white/10 dark:from-[#1a1d24] dark:via-[#1c2029] dark:to-[#22272f]'
    : 'relative z-10 overflow-visible rounded-[24px] border border-[#e8e1da] bg-gradient-to-br from-white via-[#faf8f5] to-[#fff6eb] p-5 shadow-[0_1px_3px_rgba(28,25,23,0.04),0_12px_36px_rgba(28,25,23,0.065)] dark:border-white/10 dark:from-[#1b1f29] dark:via-[#1d222c] dark:to-[#2a241e]';
  const iconTileClass = isOwnerView
    ? 'flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 text-white shadow-[0_10px_22px_rgba(51,65,85,0.24)]'
    : 'flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff8a1f] to-[#e94313] text-white shadow-[0_10px_22px_rgba(233,67,19,0.24)]';
  const calendarIconClass = isOwnerView ? 'ml-2 text-slate-500' : 'ml-2 text-[#e94313]';

  return (
    <div className="min-h-full space-y-5 bg-transparent p-0 text-[#1d1b1a] dark:text-white">
      <section className={sectionClass}>
        <div
          className={`pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full blur-3xl ${
            isOwnerView ? 'bg-slate-400/10' : 'bg-[#f5a14b]/10'
          }`}
        />
        {isOwnerView ? (
          <button
            type="button"
            onClick={() => navigate('/builder-ai/company')}
            className="relative mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <ArrowLeft size={14} />
            Back to my company
          </button>
        ) : null}
        <div className="relative mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={`${iconTileClass} overflow-hidden`}>
              {isOwnerView && data?.owner?.photo_thumb_url ? (
                <img
                  src={data.owner.photo_thumb_url}
                  alt={data.owner.name || 'Owner'}
                  className="h-full w-full object-cover"
                />
              ) : isOwnerView && data?.owner?.name ? (
                <span className="text-lg font-bold">
                  {data.owner.name
                    .split(' ')
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </span>
              ) : (
                <Building2 size={23} />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-[-0.03em]">
                {isOwnerView ? data?.owner?.name || 'Owner' : 'Company'}
              </h1>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-[#817a74] dark:text-slate-400">
                <Users size={13} />
                {data?.owner_count ?? 0} company owners · {data?.builder_count ?? 0} total builders in scope
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[#e8dfd5] bg-white/80 p-1.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <CalendarDays className={calendarIconClass} size={17} />
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
        <div className="grid gap-5 xl:grid-cols-2">
          <RosterList
            title="Company owners"
            members={data.members ?? []}
            scopeNoun="direct owner legs"
            dense
            onOwnerClick={
              isOwnerView
                ? undefined
                : (userId) => navigate(`/builder-ai/company/${userId}`)
            }
          />
          <RosterList
            title="Builders"
            members={data.builders ?? []}
            scopeNoun="builders"
            dense
          />
        </div>
      ) : null}
    </div>
  );
}
