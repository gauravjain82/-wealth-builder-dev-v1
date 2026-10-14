import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { MemberTimelinePoint } from '../../types';
import { formatDay } from '../../utils/time';
import { ChartTooltipCard } from './chart-tooltip';

interface RateTooltipProps {
  active?: boolean;
  payload?: { payload: MemberTimelinePoint }[];
}

function RateTooltip({ active, payload }: RateTooltipProps) {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) return null;
  return (
    <ChartTooltipCard title={`${formatDay(point.start_at)} · ${point.title}`}>
      <p className="font-medium text-slate-900 dark:text-white">{point.attended ? 'Came' : 'Missed'}</p>
      <p>Their rate: {point.rolling_rate === null ? '—' : `${point.rolling_rate}%`}</p>
      <p>BaseShop that day: {point.baseshop_rate === null ? '—' : `${point.baseshop_rate}%`}</p>
    </ChartTooltipCard>
  );
}

/**
 * The member's rolling attendance rate against the BaseShop's per-date rate.
 * Two series, so a legend; the BaseShop line is a dashed neutral reference,
 * distinguished by dash as well as colour.
 */
export function MemberRateChart({ timeline, window }: { timeline: MemberTimelinePoint[]; window: number }) {
  const data = timeline.map((point) => ({ ...point, label: formatDay(point.start_at) }));
  return (
    <div className="wb-ts-viz h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--wb-ts-grid)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--wb-ts-axis)', fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={16}
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
          <Tooltip content={<RateTooltip />} cursor={{ stroke: 'var(--wb-ts-axis)', strokeWidth: 1, strokeDasharray: '3 3' }} />
          <Legend
            verticalAlign="top"
            align="right"
            height={24}
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: 'var(--wb-ts-axis)' }}
          />
          <Line
            type="monotone"
            dataKey="baseshop_rate"
            name="BaseShop"
            stroke="var(--wb-ts-reference)"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="rolling_rate"
            name={`Their rate (last ${window})`}
            stroke="var(--wb-ts-series)"
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2, stroke: 'var(--wb-ts-surface)', fill: 'var(--wb-ts-series)' }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--wb-ts-surface)' }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
