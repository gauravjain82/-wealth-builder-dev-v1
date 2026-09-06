/**
 * CompareWidget — Baseshop vs Company for a metric (grouped/paired bars).
 *
 * Reads the latest value of the metric at both the BaseShop and Company segments
 * (from `/timeseries`) and paints them side by side so a viewer can compare their
 * baseshop slice against their whole organisation at a glance.
 */

import { Card } from '@shared/components';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTimeseries } from '../../hooks/use-builder-ai';
import { metricColorHex } from '../../theme';
import type { TimeseriesPayload, WidgetPayload } from '../../types';

/** Latest series value, or 0 when there is no history. */
function latest(payload: TimeseriesPayload | undefined): number {
  const series = payload?.series ?? [];
  return series.length ? series[series.length - 1].value : 0;
}

/** Render a BaseShop-vs-Company comparison for a widget's metric. */
export function CompareWidget({ widget }: { widget: WidgetPayload }) {
  const code = widget.metric?.code ?? '';
  const baseshop = useTimeseries({ metric: code, scope: 'baseshop', enabled: Boolean(code) });
  const company = useTimeseries({ metric: code, scope: 'company', enabled: Boolean(code) });
  const color = metricColorHex(code, widget.metric?.display?.color as string | undefined);
  const loading = baseshop.isLoading || company.isLoading;

  const rows = [
    { name: 'BaseShop', value: latest(baseshop.data) },
    { name: 'Company', value: latest(company.data) },
  ];

  return (
    <Card className="p-4">
      <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
        {widget.title || `${widget.metric?.name ?? 'Metric'}: BaseShop vs Company`}
      </div>
      <div className="h-48">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading…</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-400" />
              <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400" width={44} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} cursor={{ fill: 'transparent' }} />
              <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={72} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
