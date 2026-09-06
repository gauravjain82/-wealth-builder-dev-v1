/**
 * ProgressRingWidget — a goal-progress gauge (ring) + raw value/target label.
 *
 * The ring honours `display_cap_100` (Decision 23) by filling from `capped_pct`,
 * while the label shows the uncapped `current / target` and `pct`.
 */

import { Card } from '@shared/components';
import { AttainmentRing } from '../attainment-ring';
import type { WidgetPayload } from '../../types';

/** Format a value compactly for the label. */
function fmt(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}

/** Render a progress-ring widget from a dashboard widget payload. */
export function ProgressRingWidget({ widget }: { widget: WidgetPayload }) {
  const current = widget.current ?? 0;
  const hasGoal = widget.target !== undefined && widget.target !== null && widget.target > 0;
  const ringPct = hasGoal ? widget.capped_pct ?? 0 : current > 0 ? 100 : 0;
  const pct = widget.pct ?? null;

  return (
    <Card className="flex items-center gap-4 p-4">
      <AttainmentRing pct={ringPct} size={72} stroke={8} label={pct !== null ? `${Math.round(pct)}%` : '—'} />
      <div className="min-w-0">
        <div className="truncate text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-white/60">
          {widget.metric?.name ?? widget.title}
        </div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-xl font-bold text-slate-900 dark:text-white">{fmt(current)}</span>
          {hasGoal && (
            <span className="text-sm text-slate-400 dark:text-white/50">
              / {fmt(widget.target as number)}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
