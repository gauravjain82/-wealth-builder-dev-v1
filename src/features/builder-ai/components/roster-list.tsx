/** Searchable list of builders with per-metric current/goal + "Built" badge. */

import { useMemo, useState } from 'react';

import type { BuilderMemberRow, BuilderMetricKey } from '../services/builder-ai-service';

const METRIC_ORDER: BuilderMetricKey[] = ['recruits', 'points', 'licenses', 'registrations'];
const METRIC_LABELS: Record<BuilderMetricKey, string> = {
  recruits: 'Recruits',
  points: 'Points',
  licenses: 'Licenses',
  registrations: 'Registrations',
};

function fmt(value: number | string): string {
  const num = typeof value === 'string' ? Number(value) : value;
  return Number.isNaN(num) ? String(value) : num.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function RosterList({ members }: { members: BuilderMemberRow[] }) {
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
        <div className="p-8 text-center text-sm text-gray-500">No builders to show yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-400">
                <th className="px-4 py-2">Builder</th>
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
                  {METRIC_ORDER.map((key) => (
                    <td key={key} className="px-4 py-2 text-center text-gray-700 dark:text-white/80">
                      {fmt(m.metrics[key].current)}
                      <span className="text-gray-400"> / {fmt(m.metrics[key].goal)}</span>
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
