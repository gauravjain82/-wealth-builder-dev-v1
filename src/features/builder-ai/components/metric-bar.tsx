/**
 * MetricBar — a labelled horizontal progress bar in the metric's own colour.
 *
 * Used on roster rows and metric lists. The fill width honours the goal cap
 * (Decision 23 — pass `cappedPct`); the value label shows the raw `current`
 * (and `/ target` when a goal exists) so nothing is hidden.
 */

import { metricColorHex } from '../theme';
import type { RosterMetricCell } from '../types';

export interface MetricBarProps {
  cell: RosterMetricCell;
  /** Metric display name for the label (falls back to the code). */
  name?: string;
}

/** Format a number compactly (e.g. 360000 → 360K). */
function compact(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}

/** Render one metric's progress bar with its configured colour. */
export function MetricBar({ cell, name }: MetricBarProps) {
  const color = metricColorHex(cell.code, cell.display?.color as string | undefined);
  const hasGoal = cell.target !== undefined && cell.target > 0;
  const fill = hasGoal ? Math.max(0, Math.min(100, cell.capped_pct ?? 0)) : cell.current > 0 ? 100 : 0;

  return (
    <div className="w-full">
      <div className="mb-0.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-white/60">
        <span className="capitalize">{name ?? cell.code}</span>
        <span className="font-medium text-slate-700 dark:text-white/80">
          {compact(cell.current)}
          {hasGoal ? ` / ${compact(cell.target as number)}` : ''}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
        <div
          className="h-full rounded-full"
          style={{ width: `${fill}%`, backgroundColor: color, transition: 'width 400ms ease' }}
        />
      </div>
    </div>
  );
}
