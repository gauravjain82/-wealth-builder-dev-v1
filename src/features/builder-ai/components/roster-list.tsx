/** Searchable Builder AI roster rendered as individual member cards. */

import { useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';

import type { BuilderMemberRow, BuilderMetricKey } from '../services/builder-ai-service';

const METRIC_ORDER: BuilderMetricKey[] = ['recruits', 'points', 'licenses', 'registrations'];
const METRIC_LABELS: Record<BuilderMetricKey, string> = {
  recruits: 'Recruits', points: 'Points', licenses: 'Licenses', registrations: 'Registrations',
};
const METRIC_COLORS: Record<BuilderMetricKey, string> = {
  recruits: '#3b82f6', points: '#10b981', licenses: '#f43f5e', registrations: '#f59e0b',
};

function fmt(value: number | string): string {
  const num = typeof value === 'string' ? Number(value) : value;
  return Number.isNaN(num) ? String(value) : num.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function clampPct(pct: number): number {
  return Number.isNaN(pct) ? 0 : Math.max(0, Math.min(100, pct));
}

function MetricBar({ pct, color }: { pct: number; color: string }) {
  return <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10"><div className="h-full rounded-full transition-all" style={{ width: `${clampPct(pct)}%`, backgroundColor: color }} /></div>;
}

function OverallRing({ pct }: { pct: number }) {
  const value = clampPct(pct);
  const size = 52;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = value >= 100 ? '#10b981' : value >= 50 ? '#f59e0b' : '#f08a32';
  return (
    <div className="relative inline-flex items-center justify-center" title={`${Math.round(value)}% overall`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-gray-100 dark:stroke-white/10" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} stroke={color} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} className="transition-all" />
      </svg>
      <span className="absolute text-[10px] font-bold text-gray-700 dark:text-white/80">{Math.round(value)}%</span>
    </div>
  );
}

function overallPct(member: BuilderMemberRow): number {
  const values = METRIC_ORDER.map((key) => clampPct(member.metrics[key].pct));
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function RosterList({ members, scopeNoun = 'builders' }: { members: BuilderMemberRow[]; scopeNoun?: string }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? members.filter((member) => (member.name || '').toLowerCase().includes(term) || (member.agency_code || '').toLowerCase().includes(term)) : members;
  }, [members, search]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#e94313]" size={17} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or agent code…" className="w-full rounded-xl border border-[#e8dfd6] bg-white py-3 pl-11 pr-4 text-sm shadow-[0_1px_2px_rgba(28,25,23,0.04),0_6px_18px_rgba(28,25,23,0.045)] outline-none transition focus:border-[#eea35f] focus:ring-4 focus:ring-[#f4a259]/10 dark:border-white/10 dark:bg-[#222833] dark:text-white" />
      </div>

      {filtered.length === 0 ? (
        <div className="flex min-h-[210px] flex-col items-center justify-center rounded-2xl border border-[#e8dfd6] bg-white p-8 text-sm text-gray-500 dark:border-white/10 dark:bg-[#222833]">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff8a1f] to-[#e94313] text-white"><Users size={21} /></div>
          No {scopeNoun} to show yet.
        </div>
      ) : (
        <div className="grid gap-4 2xl:grid-cols-2">
        {filtered.map((member) => (
        <article key={member.user_id} className="grid gap-5 rounded-2xl border border-[#e8dfd6] bg-white p-5 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_rgba(28,25,23,0.055)] transition duration-200 hover:-translate-y-0.5 hover:border-[#e3d5c8] hover:shadow-[0_2px_4px_rgba(28,25,23,0.05),0_14px_32px_rgba(28,25,23,0.09)] dark:border-white/10 dark:bg-[#222833] sm:grid-cols-[minmax(180px,1fr)_60px] sm:items-center lg:grid-cols-[minmax(190px,0.8fr)_60px_minmax(0,1.8fr)] lg:gap-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-[#fff1e3] bg-gradient-to-br from-[#ff9a29] to-[#e94313] text-lg font-bold text-white shadow-[0_6px_16px_rgba(233,67,19,0.22)] dark:border-[#443224]">{(member.name || '?').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold">{member.name || 'Unnamed owner'}</h3>{member.is_built ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">Built</span> : null}</div>
              <p className="mt-1 text-xs text-gray-400">{member.agency_code || 'No agent code'}</p>
              {member.level ? <p className="mt-0.5 text-xs font-medium text-[#e94313] dark:text-[#ff8a5c]">{member.level}</p> : null}
            </div>
          </div>
          <div className="flex sm:justify-end"><OverallRing pct={overallPct(member)} /></div>
              <div className="grid gap-x-5 gap-y-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-1">
            {METRIC_ORDER.map((key) => <div key={key}><div className="flex justify-between gap-3 text-xs"><span className="font-semibold">{METRIC_LABELS[key]}</span><span>{fmt(member.metrics[key].current)} <span className="text-gray-400">/ {fmt(member.metrics[key].goal)}</span></span></div><MetricBar pct={member.metrics[key].pct} color={METRIC_COLORS[key]} /></div>)}
          </div>
        </article>
        ))}
        </div>
      )}
    </div>
  );
}
