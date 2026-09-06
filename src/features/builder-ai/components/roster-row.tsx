/**
 * RosterRow — one builder in the roster list.
 *
 * Identity (avatar, name, level code, Company-Owner accent) + a colour-coded
 * attainment ring + per-metric progress bars in each metric's colour. An
 * optional Remove action surfaces here (removal is a direct action, Decision 9).
 */

import { Badge } from '@shared/components';
import { Trash2 } from 'lucide-react';
import { AttainmentRing } from './attainment-ring';
import { MetricBar } from './metric-bar';
import { levelAccentHex, statusStyle } from '../theme';
import type { MetricRef, RosterRow as RosterRowData } from '../types';

export interface RosterRowProps {
  row: RosterRowData;
  /** Metric metadata (for bar labels), keyed to the row's cells by code. */
  metrics: MetricRef[];
  /** When provided, renders a Remove action for this builder. */
  onRemove?: (row: RosterRowData) => void;
}

/** Initials fallback for a missing avatar. */
function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/** Render a single roster row. */
export function RosterRow({ row, metrics, onRemove }: RosterRowProps) {
  const status = statusStyle(row.status);
  const nameByCode = new Map(metrics.map((m) => [m.code, m.name]));

  return (
    <div className="flex items-center gap-4 border-b border-slate-100 px-3 py-3 last:border-0 dark:border-white/5">
      {/* Identity */}
      <div className="flex min-w-0 flex-[1.4] items-center gap-3">
        {row.avatar ? (
          <img
            src={row.avatar}
            alt={row.name}
            className="h-9 w-9 shrink-0 rounded-full object-cover"
            style={{ boxShadow: `0 0 0 2px ${levelAccentHex(row.is_company_owner)}` }}
          />
        ) : (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-white/80"
            style={{ boxShadow: `0 0 0 2px ${levelAccentHex(row.is_company_owner)}` }}
          >
            {initials(row.name)}
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-slate-900 dark:text-white">
            {row.name}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/50">
            {row.level_code && (
              <span className="rounded bg-slate-100 px-1 font-medium dark:bg-white/10">
                {row.level_code}
              </span>
            )}
            {row.agency_code && <span className="truncate">{row.agency_code}</span>}
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="hidden w-24 shrink-0 sm:block">
        <Badge variant={status.badge}>{status.label}</Badge>
      </div>

      {/* Per-metric bars */}
      <div className="hidden flex-[2] flex-col gap-2 md:flex">
        {row.metrics.map((cell) => (
          <MetricBar key={cell.code} cell={cell} name={nameByCode.get(cell.code)} />
        ))}
      </div>

      {/* Attainment ring */}
      <div className="shrink-0">
        <AttainmentRing pct={row.attainment_pct} />
      </div>

      {/* Remove */}
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(row)}
          aria-label={`Remove ${row.name}`}
          className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}
