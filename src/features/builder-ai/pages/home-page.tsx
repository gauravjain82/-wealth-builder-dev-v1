/** BuilderAI Home: dashboard view styled to match the provided mockup. */

import { useMemo, useState } from 'react';
import { BarChart3, Building2, CalendarDays, Store, Users } from 'lucide-react';

import {
  TrackerDateRangeFilter,
  type DatePresetKey,
  type TrackerDateRangeChange,
} from '@/shared/components/tracker-date-range-filter';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { useAuth } from '@/features/auth/hooks/use-auth';

import { MetricGoalCardGrid } from '../components/metric-goal-card';
import { SegmentToggle, type SegmentOption } from '../components/segment-toggle';
import { useBuilderHome } from '../hooks/use-builder-ai';
import type { BuilderRange, BuilderSegment } from '../services/builder-ai-service';

function StatCard({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'orange' }) {
  const toneClasses =
    tone === 'orange'
      ? 'border-[#f6d2a9] bg-gradient-to-br from-[#fffaf4] to-[#fdf2e7] text-[#f08c2d] dark:border-[#f59e0b]/30 dark:from-[#2b1d0d] dark:to-[#241a12] dark:text-[#fbbf6d]'
      : 'border-[#e9e1d8] bg-[#f7f5f4] text-[#1d1b1a] dark:border-white/10 dark:bg-[#222833] dark:text-white';

  return (
    <div className={`group flex flex-col items-center justify-center rounded-2xl border p-3 text-center shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_rgba(28,25,23,0.055)] transition duration-200 hover:-translate-y-0.5 hover:border-[#e3d5c8] hover:shadow-[0_2px_4px_rgba(28,25,23,0.05),0_14px_32px_rgba(28,25,23,0.09)] ${toneClasses}`}>
      <div className="text-3xl font-black leading-none tracking-[-0.05em]">{value}</div>
      <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[#6d6a67] dark:text-slate-300">{label}</div>
    </div>
  );
}

function SizeProgress({ label, value, type }: { label: string; value: number; type: 'company' | 'baseshop' }) {
  const total = value;
  const progress = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  const Icon = type === 'company' ? Building2 : Store;

  return (
    <div className="group rounded-2xl border border-[#eadfd5] bg-gradient-to-br from-white via-[#fffdfa] to-[#fff7ef] p-4 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_rgba(28,25,23,0.055)] transition duration-200 hover:-translate-y-0.5 hover:border-[#e3d5c8] hover:shadow-[0_2px_4px_rgba(28,25,23,0.05),0_14px_32px_rgba(28,25,23,0.09)] dark:border-white/10 dark:from-[#252b36] dark:via-[#222833] dark:to-[#29241f]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff8a1f] to-[#e94313] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition-transform duration-200 group-hover:scale-105 dark:from-[#ff8a1f] dark:to-[#e94313] dark:text-white">
            <Icon size={18} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#2a2827] dark:text-slate-100">{label}</p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-[#99918a] dark:text-slate-400">
              Organization overview
            </p>
          </div>
        </div>
        <div className="shrink-0 rounded-full border border-[#f4c4b4] bg-[#fff7f2] px-3 py-1 text-sm font-bold text-[#e94313] shadow-sm dark:border-[#f0522b]/25 dark:bg-[#39231f] dark:text-[#ff8a5c]">
          {value} <span className="font-medium text-[#bd9a7b] dark:text-[#c89c70]">/ {total}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#eeeae6] shadow-[inset_0_1px_3px_rgba(15,23,42,0.06)] dark:bg-[#171c25]"
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={value}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#ff9a29] via-[#f76a1f] to-[#e94313] shadow-[0_0_10px_rgba(233,67,19,0.28)] transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

const REPORTING_SEGMENTS: SegmentOption[] = [
  { key: 'company', label: 'Total Builders' },
  { key: 'baseshop', label: 'Baseshop Builders' },
];

function todayString(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export default function BuilderHomePage() {
  const [preset, setPreset] = useState<DatePresetKey>('thisMonth');
  const [range, setRange] = useState<BuilderRange>({});
  const [segment, setSegment] = useState<BuilderSegment>('company');
  const [reportingDate, setReportingDate] = useState<string>(todayString);
  const { data } = useBuilderHome(segment, range);
  const reportingRange = useMemo<BuilderRange>(
    () => (reportingDate ? { startDate: reportingDate, endDate: reportingDate } : {}),
    [reportingDate]
  );
  const { data: reportingData, isLoading: reportingLoading } = useBuilderHome(segment, reportingRange);
  const { user } = useAuth();

  const firstName = useMemo(
    () => (user?.displayName || user?.name || user?.email || 'User').split(' ')[0],
    [user]
  );

  const handleRangeChange = (change: TrackerDateRangeChange) => {
    setPreset(change.preset);
    setRange({ startDate: change.startDate, endDate: change.endDate });
  };

  return (
    <div className="min-h-full bg-transparent p-0 text-[#1b1a1a] transition-colors dark:text-white">
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,60%)_minmax(300px,40%)]">
        <section className="rounded-[22px] border border-[#e7e1da] bg-[#f5f3f1] p-5 shadow-[0_1px_3px_rgba(28,25,23,0.04),0_12px_36px_rgba(28,25,23,0.065)] dark:border-white/10 dark:bg-[#1b1f29] md:p-6">
          <div className="mb-2 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <h1 className="bg-gradient-to-r from-[#ff9a29] via-[#f76a1f] to-[#e94313] bg-clip-text text-4xl font-black uppercase leading-[0.86] tracking-[-0.07em] text-transparent md:text-5xl dark:from-[#ffb45b] dark:via-[#ff7a2e] dark:to-[#f0522b]">
              Billion Dollar
              <br />
              Company
            </h1>
            <div className="relative z-20 flex shrink-0 items-center gap-2 rounded-xl border border-[#e8dfd5] bg-white/80 p-1.5 shadow-[0_4px_14px_rgba(28,25,23,0.06)] backdrop-blur dark:border-white/10 dark:bg-white/5">
            <CalendarDays className="ml-2 text-[#e94313]" size={17} />
              <TrackerDateRangeFilter value={preset} onChange={handleRangeChange} />
            </div>
          </div>

          <div className="mt-6 flex min-w-0 flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="mb-4 text-2xl font-semibold text-[#2b2928] dark:text-slate-100">Welcome back {firstName}</p>

              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#ff8a1f] to-[#e94313] px-7 py-3 text-base font-semibold text-white shadow-[0_10px_26px_rgba(233,67,19,0.28)] transition duration-200 hover:brightness-105"
              >
                Analyze Your Company
              </button>

              <div className="mt-7 grid gap-3">
                <SizeProgress label="Your Company Size" value={data?.sizes.company_size ?? 0} type="company" />
                <SizeProgress label="Your Baseshop Size" value={data?.sizes.baseshop_size ?? 0} type="baseshop" />
              </div>
            </div>

            <div className="flex shrink-0 justify-center lg:justify-end">
              <div className="relative flex h-[170px] w-[170px] items-center justify-center rounded-full border-[5px] border-[#f3a05b] bg-[radial-gradient(circle,_rgba(243,160,91,0.18),_rgba(243,160,91,0.04)_52%,_transparent_70%)] p-2.5 shadow-[0_12px_28px_rgba(243,157,77,0.18)] dark:border-[#f8b56a] dark:bg-[radial-gradient(circle,_rgba(248,181,106,0.2),rgba(22,26,34,0.06)_58%,transparent_70%)] sm:h-[200px] sm:w-[200px] sm:border-[6px] sm:p-3 2xl:h-[220px] 2xl:w-[220px]">
                <div className="h-full w-full overflow-hidden rounded-full bg-gradient-to-br from-[#ded8d4] via-[#b7b3b0] to-[#7d7a78] dark:from-[#4b5362] dark:via-[#313846] dark:to-[#111827]">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={firstName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-end justify-center bg-[radial-gradient(circle_at_32%_22%,rgba(255,255,255,0.75),transparent_26%),linear-gradient(180deg,#ebdfd8_0%,#efe8e2_30%,#7d7a76_100%)] dark:bg-[radial-gradient(circle_at_32%_22%,rgba(255,255,255,0.2),transparent_26%),linear-gradient(180deg,#373d4a_0%,#252b37_28%,#111827_100%)]">
                      <div className="mb-3 h-24 w-24 rounded-full bg-[radial-gradient(circle_at_50%_30%,#f7d6b6_0%,#e8b98a_28%,#ca8d5c_70%,#7a4a36_100%)] shadow-inner" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="grid min-w-0 gap-5 sm:grid-cols-2 xl:h-full xl:grid-cols-1 xl:grid-rows-2">
          <div className="flex h-full flex-col rounded-[24px] border border-[#e8e1db] bg-[#f6f4f2] p-4 shadow-[0_1px_3px_rgba(28,25,23,0.04),0_12px_36px_rgba(28,25,23,0.065)] dark:border-white/10 dark:bg-[#1b1f29]">
            <h2 className="mb-4 text-2xl font-semibold text-[#2d2a29] dark:text-slate-100">Your Organization</h2>
            <div className="grid flex-1 grid-cols-3 gap-3">
              <StatCard label="Company Owners" value={data?.organization.company_owners ?? 0} />
              <StatCard label="Total Builders" value={data?.organization.total_builders ?? 0} />
              <StatCard label="Baseshop Builders" value={data?.organization.baseshop_builders ?? 0} />
            </div>
          </div>

          <div className="flex h-full flex-col rounded-[24px] border border-[#e8e1db] bg-[#f6f4f2] p-4 shadow-[0_1px_3px_rgba(28,25,23,0.04),0_12px_36px_rgba(28,25,23,0.065)] dark:border-white/10 dark:bg-[#1b1f29]">
            <h2 className="mb-4 text-2xl font-semibold text-[#2d2a29] dark:text-slate-100">Builders Built</h2>
            <div className="grid flex-1 grid-cols-3 gap-3">
              <div className="group flex flex-col items-center justify-center rounded-2xl border border-[#e8ddd3] bg-gradient-to-br from-white to-[#fff9f3] px-2 py-4 text-center shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_rgba(28,25,23,0.055)] transition duration-200 hover:-translate-y-0.5 hover:border-[#e3d5c8] hover:shadow-[0_2px_4px_rgba(28,25,23,0.05),0_14px_32px_rgba(28,25,23,0.09)] dark:border-white/10 dark:from-[#252b36] dark:to-[#202630]">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff8a1f] to-[#e94313] text-white transition-transform group-hover:scale-105 dark:from-[#ff8a1f] dark:to-[#e94313] dark:text-white">
                  <Building2 size={18} />
                </div>
                <div className="text-3xl font-black text-[#1d1b1a] dark:text-white">{data?.builders_built.company ?? 0}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[#706d6a] dark:text-slate-300">Company</div>
              </div>

              <div className="group flex flex-col items-center justify-center rounded-2xl border border-[#e8ddd3] bg-gradient-to-br from-white to-[#fff9f3] px-2 py-4 text-center shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_rgba(28,25,23,0.055)] transition duration-200 hover:-translate-y-0.5 hover:border-[#e3d5c8] hover:shadow-[0_2px_4px_rgba(28,25,23,0.05),0_14px_32px_rgba(28,25,23,0.09)] dark:border-white/10 dark:from-[#252b36] dark:to-[#202630]">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff8a1f] to-[#e94313] text-white transition-transform group-hover:scale-105 dark:from-[#ff8a1f] dark:to-[#e94313] dark:text-white">
                  <Store size={18} />
                </div>
                <div className="text-3xl font-black text-[#1d1b1a] dark:text-white">{data?.builders_built.baseshop ?? 0}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[#706d6a] dark:text-slate-300">Baseshop</div>
              </div>

              <div className="group flex flex-col items-center justify-center rounded-2xl border border-[#e8ddd3] bg-gradient-to-br from-white to-[#fff9f3] px-2 py-4 text-center shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_rgba(28,25,23,0.055)] transition duration-200 hover:-translate-y-0.5 hover:border-[#e3d5c8] hover:shadow-[0_2px_4px_rgba(28,25,23,0.05),0_14px_32px_rgba(28,25,23,0.09)] dark:border-white/10 dark:from-[#252b36] dark:to-[#202630]">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff8a1f] to-[#e94313] text-white transition-transform group-hover:scale-105 dark:from-[#ff8a1f] dark:to-[#e94313] dark:text-white">
                  <Users size={18} />
                </div>
                <div className="text-3xl font-black text-[#1d1b1a] dark:text-white">
                  {(data?.builders_built.company ?? 0) + (data?.builders_built.baseshop ?? 0)}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[#706d6a] dark:text-slate-300">Total</div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <section className="relative mt-6 overflow-hidden rounded-[22px] border border-[#e8ddd3] bg-gradient-to-br from-[#f8f6f3] via-[#f7f4f1] to-[#fff8f0] p-4 shadow-[0_1px_3px_rgba(28,25,23,0.04),0_12px_36px_rgba(28,25,23,0.065)] dark:border-white/10 dark:from-[#1b1f29] dark:via-[#1b1f29] dark:to-[#28231e] md:p-5">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#f6a654]/10 blur-3xl" />
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff8a1f] to-[#e94313] text-white shadow-[0_8px_18px_rgba(233,67,19,0.22)]">
              <BarChart3 size={21} />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-[#2d2a29] dark:text-slate-100">Daily Reporting</h2>
              <p className="text-xs text-[#8b837c] dark:text-slate-400">Track progress toward your organization goals</p>
            </div>
          </div>

          <SegmentToggle value={segment} onChange={setSegment} options={REPORTING_SEGMENTS} />

          <div className="relative z-20 flex shrink-0 items-center gap-2 rounded-xl border border-[#e8dfd5] bg-white/80 p-1.5 shadow-[0_4px_14px_rgba(28,25,23,0.06)] backdrop-blur dark:border-white/10 dark:bg-white/5">
            <CalendarDays className="ml-2 text-[#e94313]" size={17} />
            <DatePicker value={reportingDate} onChange={setReportingDate} maxDate={new Date()} />
          </div>
        </div>

        {reportingLoading || !reportingData ? (
          <div className="rounded-2xl border border-[#ece7e2] bg-white/60 p-8 text-center text-sm text-[#7d7b79] dark:border-white/10 dark:bg-[#222833] dark:text-slate-300">
            Loading…
          </div>
        ) : (
          <MetricGoalCardGrid cards={reportingData.reporting.cards} />
        )}
      </section>
    </div>
  );
}
