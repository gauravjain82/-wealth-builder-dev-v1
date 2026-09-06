/**
 * TrendWidget — a metric's value over periods (area chart from `/timeseries`).
 *
 * Self-contained: it fetches its own series from the metric code + page segment,
 * so the dashboard config can drop a trend anywhere without page-level plumbing.
 */

import { Card } from '@shared/components';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTimeseries } from '../../hooks/use-builder-ai';
import { metricColorHex } from '../../theme';
import type { DashboardScope, WidgetPayload } from '../../types';

export interface TrendWidgetProps {
  widget: WidgetPayload;
  scope: DashboardScope;
}

/** Short month/day label for the x-axis. */
function axisLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Render a trend area chart for a widget's metric. */
export function TrendWidget({ widget, scope }: TrendWidgetProps) {
  const code = widget.metric?.code ?? '';
  const { data, isLoading } = useTimeseries({ metric: code, scope, enabled: Boolean(code) });
  const color = metricColorHex(code, widget.metric?.display?.color as string | undefined);
  const points = (data?.series ?? []).map((p) => ({ label: axisLabel(p.start_date), value: p.value }));

  return (
    <Card className="p-4">
      <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
        {widget.title || widget.metric?.name || 'Trend'}
      </div>
      <div className="h-48">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading…</div>
        ) : points.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            No history yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${code}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400" />
              <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400" width={40} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#grad-${code})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
