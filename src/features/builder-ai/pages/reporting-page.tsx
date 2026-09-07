/** BuilderAI Reporting: one daily line chart per metric across the selected range. */

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';

import {
  TrackerDateRangeFilter,
  resolvePresetRange,
  type DatePresetKey,
  type TrackerDateRangeChange,
} from '@/shared/components/tracker-date-range-filter';

import { SegmentToggle } from '../components/segment-toggle';
import { useBuilderReporting } from '../hooks/use-builder-ai';
import type {
  BuilderMetricKey,
  BuilderRange,
  BuilderReportingPoint,
  BuilderSegment,
} from '../services/builder-ai-service';

const DEFAULT_PRESET: DatePresetKey = 'last6Months';

const METRIC_COLORS: Record<BuilderMetricKey, string> = {
  recruits: '#3b82f6',
  points: '#10b981',
  licenses: '#f43f5e',
  registrations: '#f59e0b',
};

/** Turn an ISO date (or legacy "Sep 2026" label) into a compact axis/tooltip label. */
function formatAxisDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00`);
    return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return value;
}

function MetricTooltip({
  active,
  payload,
  label,
  color,
  title,
}: TooltipProps<number, string> & { color: string; title: string }) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/10 dark:bg-[#1b2433]">
      <div className="mb-1 text-gray-500 dark:text-white/50">{formatAxisDate(String(label))}</div>
      <div className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-white">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        {title}: {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

function MetricTrend({
  metricKey,
  label,
  series,
}: {
  metricKey: BuilderMetricKey;
  label: string;
  series: BuilderReportingPoint[];
}) {
  const color = METRIC_COLORS[metricKey];
  const gradientId = `builder-report-${metricKey}`;

  const data = useMemo(
    () =>
      series.map((point) => ({
        x: point.date ?? point.label,
        value: Number(point[metricKey]),
      })),
    [series, metricKey]
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-medium text-gray-600 dark:text-white/70">{label}</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} vertical={false} />
          <XAxis
            dataKey="x"
            tick={{ fontSize: 11, fill: 'currentColor' }}
            tickFormatter={formatAxisDate}
            minTickGap={40}
            interval="preserveStartEnd"
            tickLine={false}
            axisLine={false}
            className="text-gray-400 dark:text-white/40"
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'currentColor' }}
            allowDecimals={false}
            width={44}
            tickLine={false}
            axisLine={false}
            className="text-gray-400 dark:text-white/40"
          />
          <Tooltip
            content={<MetricTooltip color={color} title={label} />}
            cursor={{ stroke: color, strokeOpacity: 0.3, strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            name={label}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function BuilderReportingPage() {
  const [preset, setPreset] = useState<DatePresetKey>(DEFAULT_PRESET);
  const [range, setRange] = useState<BuilderRange>(() => resolvePresetRange(DEFAULT_PRESET));
  const [segment, setSegment] = useState<BuilderSegment>('company');
  const { data, isLoading } = useBuilderReporting(segment, range);

  const handleRangeChange = (change: TrackerDateRangeChange) => {
    setPreset(change.preset);
    setRange({ startDate: change.startDate, endDate: change.endDate });
  };

  return (
    <div className="space-y-5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Reporting</h1>
        <div className="flex items-center gap-3">
          <SegmentToggle value={segment} onChange={setSegment} />
          <TrackerDateRangeFilter value={preset} onChange={handleRangeChange} />
        </div>
      </div>

      {isLoading || !data ? (
        <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.metrics.map((metric) => (
            <MetricTrend
              key={metric.key}
              metricKey={metric.key}
              label={metric.label}
              series={data.series}
            />
          ))}
        </div>
      )}
    </div>
  );
}
