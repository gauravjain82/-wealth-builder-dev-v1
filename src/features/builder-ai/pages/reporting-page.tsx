/** BuilderAI Reporting: one line chart per metric across the selected months. */

import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  TrackerDateRangeFilter,
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

const METRIC_COLORS: Record<BuilderMetricKey, string> = {
  recruits: '#3b82f6',
  points: '#10b981',
  licenses: '#f43f5e',
  registrations: '#f59e0b',
};

function MetricTrend({
  metricKey,
  label,
  series,
}: {
  metricKey: BuilderMetricKey;
  label: string;
  series: BuilderReportingPoint[];
}) {
  const data = series.map((point) => ({
    label: point.label,
    value: Number(point[metricKey]),
  }));
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: METRIC_COLORS[metricKey] }}
        />
        <span className="text-sm font-medium text-gray-600 dark:text-white/70">{label}</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            name={label}
            stroke={METRIC_COLORS[metricKey]}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function BuilderReportingPage() {
  const [preset, setPreset] = useState<DatePresetKey>('last6Months');
  const [range, setRange] = useState<BuilderRange>({});
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
