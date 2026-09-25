/** Display helpers shared by the pipeline components. */

import type { PipelineJobName } from '../types';

/** Human labels for the backend's job names. */
export const JOB_LABELS: Record<PipelineJobName, string> = {
  recalculate_daily: 'Daily recalculation',
  rebuild_monthly: 'Monthly snapshot',
  pipeline_check: 'Capability check',
};

/** Local date and time, or an em dash when the timestamp is absent. */
export function formatTimestamp(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

/** A duration in seconds rendered compactly. */
export function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  if (seconds < 1) return '<1s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.round(seconds % 60)}s`;
}

/** An inclusive date range, or an em dash when the job takes no range. */
export function formatRange(start: string | null, end: string | null): string {
  if (!start && !end) return '—';
  if (start === end) return start ?? '—';
  return `${start ?? '?'} → ${end ?? '?'}`;
}

/** Thousands-separated integer. */
export function formatCount(value: number): string {
  return value.toLocaleString();
}
