/**
 * SegmentControl — the `Individual | BaseShop | SuperBase | SuperTeam` toggle
 * (Decision 31). It flips the builder *segment* driving KPIs, roster, and goals in
 * place (Decision 15 — a segment, not an authz scope).
 *
 * The options, labels, and lock state are **not hardcoded**: they come from the
 * backend `DashboardPayload.segments` (access × program-configured labels), so an org
 * that relabels SuperTeam → "Company" needs no frontend change, and ungranted tiers
 * render disabled. A small ℹ️ hint explains the SMD boundary.
 */

import { Info } from 'lucide-react';
import { cn } from '@core/utils';
import type { DashboardScope, SegmentOption } from '../types';

export interface SegmentControlProps {
  value: DashboardScope;
  onChange: (scope: DashboardScope) => void;
  /** Toggle tiers resolved by the backend (key + label + locked). */
  segments: SegmentOption[];
}

const SMD_HINT = 'SuperBase and SuperTeam split your organization at each SMD.';

/**
 * Minimal toggle shown before the backend `segments` payload loads — everyone can see
 * these two tiers. Once the dashboard resolves, the role-gated, program-labelled
 * `DashboardPayload.segments` replaces it.
 */
export const DEFAULT_SEGMENT_OPTIONS: SegmentOption[] = [
  { key: 'individual', label: 'Individual', locked: false },
  { key: 'baseshop', label: 'BaseShop', locked: false },
];

/** Render a segmented button group for choosing the dashboard segment tier. */
export function SegmentControl({ value, onChange, segments }: SegmentControlProps) {
  if (segments.length === 0) return null;

  return (
    <div className="inline-flex items-center gap-2">
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-white/15 dark:bg-white/5">
        {segments.map((segment) => (
          <button
            key={segment.key}
            type="button"
            disabled={segment.locked}
            onClick={() => !segment.locked && onChange(segment.key)}
            title={segment.locked ? `${segment.label} — ${SMD_HINT}` : undefined}
            className={cn(
              'rounded-md px-3 py-1 text-sm font-medium transition-colors',
              segment.locked && 'cursor-not-allowed opacity-40',
              value === segment.key
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-300'
                : 'text-slate-500 hover:text-slate-800 dark:text-white/60 dark:hover:text-white',
            )}
          >
            {segment.label}
          </button>
        ))}
      </div>
      <span
        className="text-slate-400 dark:text-white/40"
        title={SMD_HINT}
        aria-label={SMD_HINT}
      >
        <Info size={15} strokeWidth={2} />
      </span>
    </div>
  );
}
