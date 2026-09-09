/** BuilderAI Bulletin: per-metric leaderboard with podium + ranked list + search. */

import { useState } from 'react';

import {
  type DatePresetKey,
  type TrackerDateRangeChange,
} from '@/shared/components/tracker-date-range-filter';

import { SegmentToggle } from '../components/segment-toggle';
import { BuilderPageHeader } from '../components/builder-page-header';
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

function fmt(value: number | string): string {
  const num = typeof value === 'string' ? Number(value) : value;
  return Number.isNaN(num) ? String(value) : num.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

const PLACE_STYLES = {
  1: { ring: 'border-amber-400', surface: 'from-[#fffdf7] to-[#fff4c5]', footer: 'from-[#f8cf4a] to-[#edaa20]', icon: 'text-amber-500' },
  2: { ring: 'border-slate-400', surface: 'from-white to-[#edf2f7]', footer: 'from-[#dce5ef] to-[#bcc9d7]', icon: 'text-slate-500' },
  3: { ring: 'border-orange-700', surface: 'from-white to-[#f8e2d3]', footer: 'from-[#dc9866] to-[#bb6f3e]', icon: 'text-orange-700' },
} as const;

function PodiumCard({ row, place, metricLabel }: { row: BuilderBulletinRow; place: 1 | 2 | 3; metricLabel: string }) {
  const style = PLACE_STYLES[place];
  const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : '🥉';
  const avatar = (row.name || '?').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  return (
    <article className={`relative overflow-hidden rounded-[22px] border border-[#e7ded5] bg-gradient-to-b ${style.surface} text-center shadow-[0_1px_3px_rgba(28,25,23,0.04),0_12px_30px_rgba(28,25,23,0.07)] dark:border-white/10 dark:from-[#252b36] dark:to-[#1d222b] ${place === 1 ? 'md:-mt-7 md:min-h-[280px]' : 'md:min-h-[250px]'}`}>
      <div className="p-5 pb-20">
      <div className={`absolute right-4 top-4 flex items-center gap-0.5 ${style.icon}`} aria-label={`${place === 1 ? 'First' : place === 2 ? 'Second' : 'Third'} place`}>
        {Array.from({ length: 4 - place }, (_, index) => <span key={index} className="text-lg leading-none">{medal}</span>)}
      </div>
      <div className={`mx-auto flex items-center justify-center rounded-full border-[3px] ${style.ring} bg-gradient-to-br from-[#ff9a29] to-[#e94313] font-bold text-white shadow-md ${place === 1 ? 'h-20 w-20 text-xl' : 'h-16 w-16'}`}>{avatar}</div>
      <div className="mt-2 truncate font-bold text-gray-900 dark:text-white">{row.name}</div>
      <div className="mt-1 text-xs text-gray-400">
        {row.agency_code}
        {row.level ? ` · ${row.level}` : ''}
      </div>
      </div>
      <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-r ${style.footer} py-3 text-[#33261c]`}><div className="text-2xl font-black">{fmt(row.value)}</div><div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{metricLabel}</div></div>
    </article>
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
    <div className="space-y-5 p-0">
      <BuilderPageHeader title="Bulletin" description="Recognizing the strongest builders in your organization" icon="bulletin" preset={preset} onRangeChange={handleRangeChange} controls={<SegmentToggle value={segment} onChange={setSegment} />}>
      <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl bg-[#f4f1ed] p-1 dark:bg-white/5">
        {METRIC_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMetric(tab.key)}
            className={`whitespace-nowrap rounded-lg px-5 py-2 text-sm transition ${
              metric === tab.key
                ? 'bg-gradient-to-r from-[#ff8a1f] to-[#e94313] font-semibold text-white shadow-sm'
                : 'text-gray-600 hover:bg-white dark:text-white/70 dark:hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      </BuilderPageHeader>

      {isLoading || !data ? (
        <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
      ) : (
        <>
          {data.podium.length > 0 ? (
            <div className="grid items-end gap-4 pt-7 md:grid-cols-3">
              {[data.podium[1], data.podium[0], data.podium[2]].map((row, index) => row ? (
                <PodiumCard key={row.user_id} row={row} place={([2, 1, 3] as const)[index]} metricLabel={metricLabel} />
              ) : null)}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-[22px] border border-[#e8e0d8] bg-white shadow-[0_1px_3px_rgba(28,25,23,0.04),0_12px_32px_rgba(28,25,23,0.06)] dark:border-white/10 dark:bg-[#1b1f29]">
            <div className="flex flex-col gap-3 border-b border-[#eee8e2] p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
              <span className="text-sm font-semibold text-gray-700 dark:text-white/80">
                Top Builders{' '}
                <span className="font-normal text-gray-400">out of {data.total_builders} builders</span>
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or agent code…"
                className="w-full rounded-xl border border-[#e8dfd6] px-3 py-2.5 text-sm outline-none transition focus:border-[#eea35f] focus:ring-4 focus:ring-[#f4a259]/10 dark:border-white/10 dark:bg-white/5 dark:text-white sm:w-72"
              />
            </div>
            {data.rows.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                {search ? `No builders match “${search}”.` : 'No more builders in this range.'}
              </div>
            ) : (
              <ul className="divide-y divide-[#f0ebe6] dark:divide-white/5">
                {data.rows.map((row) => (
                  <li
                    key={row.user_id}
                    className="flex items-center justify-between gap-4 px-4 py-3.5 transition hover:bg-[#fffaf5] dark:hover:bg-white/[0.03]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-sm font-bold text-gray-400">{row.rank}</span>
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff9a29] to-[#e94313] text-sm font-bold text-white">{(row.name || '?').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-gray-900 dark:text-white">{row.name || 'Unnamed builder'}</div>
                        <div className="text-xs text-gray-400">
                          {row.agency_code}
                          {row.level ? ` · ${row.level}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="min-w-[78px] text-right">
                      <div className="text-lg font-black text-gray-900 dark:text-white">{fmt(row.value)}</div>
                      <div className="text-[10px] uppercase tracking-wide text-gray-400">{metricLabel}</div>
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
