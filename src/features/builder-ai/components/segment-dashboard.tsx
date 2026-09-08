import { useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { DatePresetKey, TrackerDateRangeChange } from '@/shared/components/tracker-date-range-filter';

import type { BuilderRange, BuilderScopePayload } from '../services/builder-ai-service';
import { BuilderPageHeader } from './builder-page-header';
import { MetricGoalCardGrid } from './metric-goal-card';
import { RosterList } from './roster-list';

interface SegmentDashboardProps {
  title: string;
  useData: (range: BuilderRange) => UseQueryResult<BuilderScopePayload>;
  scopeNoun?: string;
}

export function SegmentDashboard({ title, useData, scopeNoun = 'builders' }: SegmentDashboardProps) {
  const [preset, setPreset] = useState<DatePresetKey>('thisMonth');
  const [range, setRange] = useState<BuilderRange>({});
  const { data, isLoading, error } = useData(range);

  const handleRangeChange = (change: TrackerDateRangeChange) => {
    setPreset(change.preset);
    setRange({ startDate: change.startDate, endDate: change.endDate });
  };

  return (
    <div className="space-y-5 p-0">
      <BuilderPageHeader
        title={title}
        description={`${data?.builder_count ?? 0} ${scopeNoun} in scope`}
        icon="baseshop"
        preset={preset}
        onRangeChange={handleRangeChange}
      >
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Couldn’t load baseshop data. Please try again.
          </div>
        ) : null}
        {isLoading || !data ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-36 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
            ))}
          </div>
        ) : (
          <MetricGoalCardGrid cards={data.cards} />
        )}
      </BuilderPageHeader>

      {!isLoading && data ? (
        <RosterList members={data.members ?? []} scopeNoun={scopeNoun} />
      ) : null}
    </div>
  );
}
