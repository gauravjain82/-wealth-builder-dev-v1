/** BuilderAI Home: org counts, "Builders Built", size bars, and daily reporting. */

import { useState } from 'react';

import {
  TrackerDateRangeFilter,
  type DatePresetKey,
  type TrackerDateRangeChange,
} from '@/shared/components/tracker-date-range-filter';

import { MetricGoalCardGrid } from '../components/metric-goal-card';
import { useBuilderHome } from '../hooks/use-builder-ai';
import type { BuilderRange, BuilderSegment } from '../services/builder-ai-service';

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  );
}

export default function BuilderHomePage() {
  const [preset, setPreset] = useState<DatePresetKey>('thisMonth');
  const [range, setRange] = useState<BuilderRange>({});
  const [segment, setSegment] = useState<BuilderSegment>('company');
  const { data, isLoading } = useBuilderHome(segment, range);

  const handleRangeChange = (change: TrackerDateRangeChange) => {
    setPreset(change.preset);
    setRange({ startDate: change.startDate, endDate: change.endDate });
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Builder AI</h1>
        <TrackerDateRangeFilter value={preset} onChange={handleRangeChange} />
      </div>

      {isLoading || !data ? (
        <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
      ) : (
        <>
          <section>
            <h2 className="mb-2 text-sm font-semibold text-gray-600 dark:text-white/70">
              Your Organization
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatCard label="Company Owners" value={data.organization.company_owners} />
              <StatCard label="Total Builders" value={data.organization.total_builders} />
              <StatCard label="Baseshop Builders" value={data.organization.baseshop_builders} />
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-gray-600 dark:text-white/70">
              Builders Built
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatCard label="Company" value={data.builders_built.company} />
              <StatCard label="Baseshop" value={data.builders_built.baseshop} />
              <StatCard
                label="Total"
                value={data.builders_built.company + data.builders_built.baseshop}
              />
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-600 dark:text-white/70">
                Daily Reporting
              </h2>
              <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5 text-xs dark:bg-white/10">
                {(['company', 'baseshop'] as BuilderSegment[]).map((seg) => (
                  <button
                    key={seg}
                    onClick={() => setSegment(seg)}
                    className={`rounded-md px-3 py-1 capitalize ${
                      segment === seg
                        ? 'bg-white font-semibold text-amber-700 shadow-sm dark:bg-white/20'
                        : 'text-gray-500'
                    }`}
                  >
                    {seg === 'company' ? 'Top Builders' : 'Baseshop Builders'}
                  </button>
                ))}
              </div>
            </div>
            <MetricGoalCardGrid cards={data.reporting.cards} />
          </section>
        </>
      )}
    </div>
  );
}
