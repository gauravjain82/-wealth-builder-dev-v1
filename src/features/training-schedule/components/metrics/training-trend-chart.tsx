import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { OccurrencePoint } from '../../types';
import { formatDay, formatTime } from '../../utils/time';
import { ChartTooltipCard } from './chart-tooltip';

interface TrendTooltipProps {
  active?: boolean;
  payload?: { payload: OccurrencePoint }[];
}

function TrendTooltip({ active, payload }: TrendTooltipProps) {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) return null;
  return (
    <ChartTooltipCard title={`${formatDay(point.start_at)} · ${formatTime(point.start_at)}`}>
      <p>{point.title}</p>
      <p className="font-medium text-slate-900 dark:text-white">
        {point.attended} of {point.expected} came{point.rate === null ? '' : ` · ${point.rate}%`}
      </p>
      <p className="text-slate-400 dark:text-white/40">Click to see who missed it</p>
    </ChartTooltipCard>
  );
}

interface TrainingTrendChartProps {
  series: OccurrencePoint[];
  onSelect: (occurrenceId: number) => void;
}

/** Attendance rate per training date — one series, so the title names it and there is no legend. */
export function TrainingTrendChart({ series, onSelect }: TrainingTrendChartProps) {
  const [asTable, setAsTable] = useState(false);
  const data = series.map((point) => ({ ...point, label: formatDay(point.start_at), value: point.rate ?? 0 }));

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Attendance per training</h2>
          <p className="text-xs text-slate-500 dark:text-white/50">Share of the people expected who came. Click a bar to see who missed it.</p>
        </div>
        <button
          type="button"
          className="text-xs font-medium text-primary hover:underline"
          onClick={() => setAsTable((value) => !value)}
        >
          {asTable ? 'Show chart' : 'Show as table'}
        </button>
      </div>

      {series.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500 dark:text-white/50">No trainings were held in this period.</p>
      ) : asTable ? (
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-slate-500 dark:text-white/50">
            <tr>
              <th className="py-1 font-medium">Date</th>
              <th className="py-1 font-medium">Training</th>
              <th className="py-1 text-right font-medium">Came</th>
              <th className="py-1 text-right font-medium">Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {series.map((point) => (
              <tr
                key={point.occurrence_id}
                className="cursor-pointer text-slate-800 hover:bg-slate-50 dark:text-white/90 dark:hover:bg-white/5"
                onClick={() => onSelect(point.occurrence_id)}
              >
                <td className="py-1.5">{formatDay(point.start_at)}</td>
                <td className="py-1.5">{point.title}</td>
                <td className="py-1.5 text-right tabular-nums">
                  {point.attended} / {point.expected}
                </td>
                <td className="py-1.5 text-right tabular-nums">{point.rate === null ? '—' : `${point.rate}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="wb-ts-viz h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barCategoryGap={4}>
              <CartesianGrid vertical={false} stroke="var(--wb-ts-grid)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--wb-ts-axis)', fontSize: 11 }}
                interval="preserveStartEnd"
                minTickGap={12}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 50, 100]}
                tickFormatter={(value: number) => `${value}%`}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--wb-ts-axis)', fontSize: 11 }}
                width={44}
              />
              <Tooltip content={<TrendTooltip />} cursor={{ fill: 'var(--wb-ts-cursor)' }} />
              <Bar
                dataKey="value"
                name="Attendance"
                fill="var(--wb-ts-series)"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
                cursor="pointer"
                onClick={(entry: { payload?: OccurrencePoint }) => {
                  if (entry?.payload) onSelect(entry.payload.occurrence_id);
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
