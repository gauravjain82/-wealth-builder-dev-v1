/** BuilderAI Bulletin: per-metric leaderboard with podium + ranked list + search. */

import { useState } from 'react';

import {
  TrackerDateRangeFilter,
  type DatePresetKey,
  type TrackerDateRangeChange,
} from '@/shared/components/tracker-date-range-filter';

import { SegmentToggle } from '../components/segment-toggle';
import { useBuilderBulletin } from '../hooks/use-builder-ai';
import type {
  BuilderBulletinRow,
  BuilderMetricKey,
  BuilderRange,
  BuilderSegment,
} from '../services/builder-ai-service';

const METRIC_TABS: { key: BuilderMetricKey; label: string }[] = [
  { key: 'recruits', label: 'Recruits' },
  { key: 'points', label: 'Points' },
  { key: 'licenses', label: 'Licenses' },
  { key: 'registrations', label: 'Registrations' },
];

const MEDALS = ['🥇', '🥈', '🥉'];

function fmt(value: number | string): string {
  const num = typeof value === 'string' ? Number(value) : value;
  return Number.isNaN(num) ? String(value) : num.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function PodiumCard({ row, place, metricLabel }: { row: BuilderBulletinRow; place: number; metricLabel: string }) {
  const emphasis = place === 0 ? 'sm:-mt-4 border-amber-300' : 'border-gray-200';
  return (
    <div className={`flex-1 rounded-xl border bg-white p-4 text-center shadow-sm dark:bg-white/5 ${emphasis}`}>
      <div className="text-2xl">{MEDALS[place]}</div>
      <div className="mt-1 truncate font-semibold text-gray-900 dark:text-white">{row.name}</div>
      <div className="text-xs text-gray-400">
        {row.agency_code}
        {row.level ? ` · ${row.level}` : ''}
      </div>
      <div className="mt-2 text-2xl font-bold text-amber-600">{fmt(row.value)}</div>
      <div className="text-[10px] uppercase tracking-wide text-gray-400">{metricLabel}</div>
    </div>
  );
}

export default function BuilderBulletinPage() {
  const [preset, setPreset] = useState<DatePresetKey>('thisMonth');
  const [range, setRange] = useState<BuilderRange>({});
  const [segment, setSegment] = useState<BuilderSegment>('company');
  const [metric, setMetric] = useState<BuilderMetricKey>('recruits');
  const [search, setSearch] = useState('');
  const { data, isLoading } = useBuilderBulletin(segment, metric, search, range);

  const handleRangeChange = (change: TrackerDateRangeChange) => {
    setPreset(change.preset);
    setRange({ startDate: change.startDate, endDate: change.endDate });
  };

  const metricLabel = METRIC_TABS.find((t) => t.key === metric)?.label ?? '';

  return (
    <div className="space-y-5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bulletin</h1>
        <div className="flex items-center gap-3">
          <SegmentToggle value={segment} onChange={setSegment} />
          <TrackerDateRangeFilter value={preset} onChange={handleRangeChange} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {METRIC_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMetric(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm ${
              metric === tab.key
                ? 'bg-amber-500 font-semibold text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading || !data ? (
        <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
      ) : (
        <>
          {data.podium.length > 0 ? (
            <div className="flex items-end gap-3">
              {data.podium.map((row, index) => (
                <PodiumCard key={row.user_id} row={row} place={index} metricLabel={metricLabel} />
              ))}
            </div>
          ) : null}

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between border-b border-gray-100 p-3 dark:border-white/10">
              <span className="text-sm font-semibold text-gray-700 dark:text-white/80">
                Top Builders{' '}
                <span className="font-normal text-gray-400">out of {data.total_builders} builders</span>
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or agent code…"
                className="w-56 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-amber-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>
            {data.rows.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                {search ? `No builders match “${search}”.` : 'No more builders in this range.'}
              </div>
            ) : (
              <ul>
                {data.rows.map((row) => (
                  <li
                    key={row.user_id}
                    className="flex items-center justify-between border-t border-gray-50 px-4 py-2.5 dark:border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-sm font-semibold text-gray-400">{row.rank}</span>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{row.name}</div>
                        <div className="text-xs text-gray-400">
                          {row.agency_code}
                          {row.level ? ` · ${row.level}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900 dark:text-white">{fmt(row.value)}</span>
                      <span className="ml-1 text-xs text-gray-400">{metricLabel.toLowerCase()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
