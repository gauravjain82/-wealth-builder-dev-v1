/**
 * SegmentControl — the `Individual | BaseShop | Company` switch from the live
 * BDC dashboard. Flips the builder *segment* driving KPIs, roster, and goals
 * in place (Decision 15 — a segment, not an authz scope).
 */

import { cn } from '@core/utils';
import type { DashboardScope } from '../types';

export interface SegmentControlProps {
  value: DashboardScope;
  onChange: (scope: DashboardScope) => void;
  /** Restrict the offered segments (e.g. Home page pins to Individual). */
  options?: DashboardScope[];
}

const LABELS: Record<DashboardScope, string> = {
  home: 'Individual',
  baseshop: 'BaseShop',
  company: 'Company',
};

const DEFAULT_OPTIONS: DashboardScope[] = ['home', 'baseshop', 'company'];

/** Render a segmented button group for choosing the dashboard segment. */
export function SegmentControl({ value, onChange, options = DEFAULT_OPTIONS }: SegmentControlProps) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-white/15 dark:bg-white/5">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium transition-colors',
            value === option
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-300'
              : 'text-slate-500 hover:text-slate-800 dark:text-white/60 dark:hover:text-white',
          )}
        >
          {LABELS[option]}
        </button>
      ))}
    </div>
  );
}
