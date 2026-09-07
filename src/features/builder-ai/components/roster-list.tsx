/** Searchable list of builders with per-metric progress bars + overall progress ring. */

import { useMemo, useState } from 'react';

import type { BuilderMemberRow, BuilderMetricKey } from '../services/builder-ai-service';

const METRIC_ORDER: BuilderMetricKey[] = ['recruits', 'points', 'licenses', 'registrations'];
const METRIC_LABELS: Record<BuilderMetricKey, string> = {
  recruits: 'Recruits',
  points: 'Points',
  licenses: 'Licenses',
  registrations: 'Registrations',
};

/** Per-metric line color, matching the KPI card accents. */
const METRIC_COLORS: Record<BuilderMetricKey, string> = {
  recruits: '#3b82f6', // blue-500
  points: '#10b981', // emerald-500
  licenses: '#f43f5e', // rose-500
  registrations: '#f59e0b', // amber-500
};

function fmt(value: number | string): string {
  const num = typeof value === 'string' ? Number(value) : value;
  return Number.isNaN(num) ? String(value) : num.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/** Title-case a plural scope noun for the roster's first column header. */
function titleCase(noun: string): string {
  return noun.replace(/\b\w/g, (c) => c.toUpperCase());
}

function clampPct(pct: number): number {
  if (Number.isNaN(pct)) return 0;
  return Math.max(0, Math.min(100, pct));
}

/** A thin colored progress line for a single metric. */
function MetricBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${clampPct(pct)}%`, backgroundColor: color }}
      />
    </div>
  );
}

/** Circular progress ring for a builder's overall goal completion. */
function OverallRing({ pct }: { pct: number }) {
  const value = clampPct(pct);
  const size = 44;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);
  // Green when complete, amber mid-way, indigo when low.
  const color = value >= 100 ? '#10b981' : value >= 50 ? '#f59e0b' : '#6366f1';
  return (
    <div
      className="relative inline-flex items-center justify-center"
      title={`${Math.round(value)}% overall`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-gray-100 dark:stroke-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all"
        />
      </svg>
      <span className="absolute text-[10px] font-semibold text-gray-700 dark:text-white/80">
        {Math.round(value)}%
      </span>
    </div>
  );
}

/** Average of the four metric percentages = overall completion. */
function overallPct(m: BuilderMemberRow): number {
  const parts = METRIC_ORDER.map((key) => clampPct(m.metrics[key].pct));
  const sum = parts.reduce((acc, p) => acc + p, 0);
  return parts.length ? sum / parts.length : 0;
}

export function RosterList({
  members,
  scopeNoun = 'builders',
}: {
  members: BuilderMemberRow[];
  /** Plural noun for the rows (e.g. "builders", "company owners"). */
  scopeNoun?: string;
}) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return members;
    return members.filter(
      (m) =>
        (m.name || '').toLowerCase().includes(term) ||
        (m.agency_code || '').toLowerCase().includes(term)
    );
  }, [members, search]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="border-b border-gray-100 p-3 dark:border-white/10">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or agent code…"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-amber-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
      </div>
      {filtered.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500">No {scopeNoun} to show yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-400">
                <th className="px-4 py-2">{titleCase(scopeNoun)}</th>
                <th className="px-4 py-2 text-center">Overall</th>
                {METRIC_ORDER.map((key) => (
                  <th key={key} className="px-4 py-2 text-center">{METRIC_LABELS[key]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.user_id} className="border-t border-gray-50 dark:border-white/5">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">{m.name}</span>
                      {m.is_built ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          Built
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-gray-400">
                      {m.agency_code}
                      {m.level ? ` · ${m.level}` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-center">
                      <OverallRing pct={overallPct(m)} />
                    </div>
                  </td>
                  {METRIC_ORDER.map((key) => (
                    <td key={key} className="px-4 py-2 align-middle">
                      <div className="mx-auto min-w-[92px]">
                        <div className="text-center text-gray-700 dark:text-white/80">
                          {fmt(m.metrics[key].current)}
                          <span className="text-gray-400"> / {fmt(m.metrics[key].goal)}</span>
                        </div>
                        <MetricBar pct={m.metrics[key].pct} color={METRIC_COLORS[key]} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
