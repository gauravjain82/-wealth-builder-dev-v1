/** Shared Company/Baseshop dashboard body: date filter + metric cards + roster. */

import { useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';

import {
  TrackerDateRangeFilter,
  type DatePresetKey,
  type TrackerDateRangeChange,
} from '@/shared/components/tracker-date-range-filter';

import type { BuilderRange, BuilderScopePayload } from '../services/builder-ai-service';
import { MetricGoalCardGrid } from './metric-goal-card';
import { RosterList } from './roster-list';

interface SegmentDashboardProps {
  title: string;
  useData: (range: BuilderRange) => UseQueryResult<BuilderScopePayload>;
  /** Plural noun for the roster rows (e.g. "builders", "company owners"). */
  scopeNoun?: string;
}

export function SegmentDashboard({
  title,
  useData,
  scopeNoun = 'builders',
}: SegmentDashboardProps) {
  const [preset, setPreset] = useState<DatePresetKey>('thisMonth');
  const [range, setRange] = useState<BuilderRange>({});
  const { data, isLoading, error } = useData(range);

  const handleRangeChange = (change: TrackerDateRangeChange) => {
    setPreset(change.preset);
    setRange({ startDate: change.startDate, endDate: change.endDate });
  };

  return (
    <div className="space-y-5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {data ? (
            <p className="text-sm text-gray-500">
              {data.builder_count} {scopeNoun} in scope
            </p>
          ) : null}
        </div>
        <TrackerDateRangeFilter value={preset} onChange={handleRangeChange} />
      </div>

      {error ? (
        <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
          Couldn’t load builder data. Please try again.
        </div>
      ) : null}

      {isLoading || !data ? (
        <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
      ) : (
        <>
          <MetricGoalCardGrid cards={data.cards} />
          <RosterList members={data.members ?? []} scopeNoun={scopeNoun} />
        </>
      )}
    </div>
  );
}
