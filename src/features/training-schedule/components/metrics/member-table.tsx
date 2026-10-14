import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Search } from 'lucide-react';

import type { MemberMetrics, MemberStatus } from '../../types';
import { formatDay } from '../../utils/time';
import { fieldClass, mutedText } from '../fields';
import { AttendanceDots, StatusChip } from './status';
import { STATUS_META, formatAgo } from '../../utils/metrics';

type SortKey = 'status' | 'name' | 'rate' | 'last' | 'total';
const FILTERS: (MemberStatus | 'all')[] = ['all', 'stopped', 'never', 'slipping', 'on_track', 'new'];
const STATUS_RANK: Record<MemberStatus, number> = { stopped: 0, never: 1, slipping: 2, on_track: 3, new: 4 };

function compare(a: MemberMetrics, b: MemberMetrics, key: SortKey): number {
  switch (key) {
    case 'name':
      return a.name.localeCompare(b.name);
    case 'rate':
      return (a.rate ?? -1) - (b.rate ?? -1);
    case 'last':
      return (a.last_attended_at ?? '').localeCompare(b.last_attended_at ?? '');
    case 'total':
      return a.total_attended - b.total_attended;
    default:
      return STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.missed_in_row - a.missed_in_row;
  }
}

interface MemberTableProps {
  members: MemberMetrics[];
  counts: Record<MemberStatus, number>;
  filter: MemberStatus | 'all';
  onFilter: (filter: MemberStatus | 'all') => void;
  onSelect: (userId: number) => void;
  window: number;
}

/** Everyone in the BaseShop, filterable by status, sortable, searchable. Cards below `md`. */
export function MemberTable({ members, counts, filter, onFilter, onSelect, window }: MemberTableProps) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'status', desc: false });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = members.filter(
      (m) => (filter === 'all' || m.status === filter) && (!q || m.name.toLowerCase().includes(q))
    );
    return filtered.sort((a, b) => (sort.desc ? -1 : 1) * compare(a, b, sort.key));
  }, [members, filter, query, sort]);

  const header = (key: SortKey, label: string, align: 'left' | 'right' = 'left') => {
    const active = sort.key === key;
    return (
      <th className={`px-3 py-2 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`} aria-sort={active ? (sort.desc ? 'descending' : 'ascending') : 'none'}>
        <button
          type="button"
          className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
          onClick={() => setSort({ key, desc: active ? !sort.desc : key !== 'name' && key !== 'status' })}
        >
          {label}
          {active ? sort.desc ? <ArrowDown size={12} aria-hidden /> : <ArrowUp size={12} aria-hidden /> : null}
        </button>
      </th>
    );
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-white/10">
        <h2 className="mr-2 text-sm font-semibold text-slate-900 dark:text-white">Everyone ({members.length})</h2>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by status">
          {FILTERS.map((value) => {
            const count = value === 'all' ? members.length : counts[value];
            return (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => onFilter(value)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  filter === value
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/15'
                }`}
              >
                {value === 'all' ? 'All' : STATUS_META[value].label} {count}
              </button>
            );
          })}
        </div>
        <div className="relative ml-auto w-full sm:w-56">
          <Search size={14} className="absolute left-3 top-3 text-slate-400" aria-hidden />
          <input className={`${fieldClass} pl-8`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name…" aria-label="Search members" />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className={`p-6 text-center ${mutedText}`}>Nobody matches.</p>
      ) : (
        <>
          <table className="hidden w-full text-sm md:table">
            <thead className="text-xs text-slate-500 dark:text-white/50">
              <tr>
                {header('name', 'Name')}
                {header('status', 'Status')}
                <th className="px-3 py-2 text-left font-medium">Last {window}</th>
                {header('rate', 'Rate', 'right')}
                {header('last', 'Last came')}
                {header('total', 'Total', 'right')}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {rows.map((member) => (
                <tr
                  key={member.user_id}
                  tabIndex={0}
                  onClick={() => onSelect(member.user_id)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(member.user_id))}
                  className="cursor-pointer text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-100 dark:text-white/90 dark:hover:bg-white/5 dark:focus-visible:bg-white/10"
                >
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-slate-900 dark:text-white">{member.name}</span>
                    {member.level ? <span className="ml-1.5 text-xs text-slate-500 dark:text-white/50">{member.level}</span> : null}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusChip status={member.status} />
                  </td>
                  <td className="px-3 py-2.5">
                    <AttendanceDots recent={member.recent} />
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{member.rate === null ? '—' : `${member.rate}%`}</td>
                  <td className="px-3 py-2.5">
                    {member.last_attended_at ? (
                      <span title={formatDay(member.last_attended_at)}>{formatAgo(member.last_attended_at)}</span>
                    ) : (
                      <span className="text-slate-400 dark:text-white/40">Never</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{member.total_attended}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="divide-y divide-slate-100 md:hidden dark:divide-white/5">
            {rows.map((member) => (
              <li key={member.user_id}>
                <button type="button" onClick={() => onSelect(member.user_id)} className="w-full space-y-1.5 p-3 text-left">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-slate-900 dark:text-white">{member.name}</span>
                    <StatusChip status={member.status} />
                  </span>
                  <span className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-white/50">
                    <AttendanceDots recent={member.recent} size={8} />
                    <span>
                      {member.rate === null ? '—' : `${member.rate}%`} ·{' '}
                      {member.last_attended_at ? formatAgo(member.last_attended_at) : 'never came'}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
