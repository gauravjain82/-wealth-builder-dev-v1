/**
 * GoalKpiCard — a headline KPI card: big value, `/ target`, and `% of goal`.
 *
 * Header fractions NEVER cap (Decision 23): we always paint the raw `current`,
 * `target`, and uncapped `pct` (e.g. `105 / 90`, `116.7%`). A thin sparkline of
 * recent values sits under the number when a series is supplied. The metric's
 * configured `display.color` drives the accent.
 */

import { Card } from '@shared/components';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { attainmentStyle, metricColorHex } from '../theme';
import type { WidgetPayload } from '../types';

export interface GoalKpiCardProps {
  widget: WidgetPayload;
  /** Optional recent values for the sparkline (oldest→newest). */
  spark?: number[];
}

/** Format a number, using compact notation for large magnitudes. */
function fmt(value: number): string {
  if (Math.abs(value) >= 10000) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US').format(value);
}

/** Render one headline goal-KPI card. */
export function GoalKpiCard({ widget, spark }: GoalKpiCardProps) {
  const current = widget.current ?? 0;
  const hasGoal = widget.target !== undefined && widget.target !== null && widget.target > 0;
  const pct = widget.pct ?? null;
  const color = metricColorHex(widget.metric?.code ?? widget.title, widget.metric?.display?.color as string | undefined);
  const pctStyle = pct !== null ? attainmentStyle(pct) : null;
  const sparkData = (spark ?? []).map((v, i) => ({ i, v }));

  return (
    <Card className="relative overflow-hidden p-4">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-white/60">
          {widget.metric?.name ?? widget.title}
        </span>
        {pctStyle && (
          <span className={`text-xs font-semibold ${pctStyle.text}`}>
            {pct?.toFixed(1)}%
          </span>
        )}
      </div>

      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-slate-900 dark:text-white">{fmt(current)}</span>
        {hasGoal && (
          <span className="text-sm text-slate-400 dark:text-white/50">
            / {fmt(widget.target as number)}
          </span>
        )}
      </div>

      {sparkData.length > 1 && (
        <div className="mt-2 h-8">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
