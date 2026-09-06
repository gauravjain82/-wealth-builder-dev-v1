/**
 * CompositionWidget — org make-up as a donut (breakdown by status or level).
 *
 * Fetches `/breakdown?group_by=…` for its metric and paints a donut with the
 * status/level colours from the theme. Defaults to grouping by status
 * (active / completed / removed).
 */

import { Card } from '@shared/components';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useBreakdown } from '../../hooks/use-builder-ai';
import { paletteColor, statusStyle } from '../../theme';
import type { BreakdownGroupBy, DashboardScope, WidgetPayload } from '../../types';

export interface CompositionWidgetProps {
  widget: WidgetPayload;
  scope: DashboardScope;
}

/** Colour a slice: status groups use status colours, others use the palette. */
function sliceColor(groupBy: BreakdownGroupBy, key: string, index: number): string {
  if (groupBy === 'status') return statusStyle(key.toUpperCase()).hex;
  return paletteColor(index);
}

/** Render a composition donut for a widget's metric. */
export function CompositionWidget({ widget, scope }: CompositionWidgetProps) {
  const code = widget.metric?.code ?? '';
  const groupBy = ((widget.config?.group_by as BreakdownGroupBy) ?? 'status') as BreakdownGroupBy;
  const { data, isLoading } = useBreakdown({
    metric: code,
    scope,
    group_by: groupBy,
    enabled: Boolean(code),
  });
  const groups = (data?.groups ?? []).filter((g) => g.count > 0 || g.value > 0);
  const slices = groups.map((g) => ({ name: g.key, value: g.count || g.value }));

  return (
    <Card className="p-4">
      <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
        {widget.title || 'Composition'}
      </div>
      <div className="h-48">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading…</div>
        ) : slices.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={slices} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                {slices.map((slice, index) => (
                  <Cell key={slice.name} fill={sliceColor(groupBy, slice.name, index)} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
