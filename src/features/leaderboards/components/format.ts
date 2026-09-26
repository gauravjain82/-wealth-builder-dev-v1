/** Display helpers shared by the leaderboard surfaces. */

import type { LeaderboardMetric, ResultSource } from '../types';

/** Ratio metrics rendered as a percentage rather than a bare number. */
const PERCENTAGE_METRICS = new Set<LeaderboardMetric>(['npr', 'lr']);

/** Metrics that are ratios at all — the backend returns these as whole numbers. */
export const RATIO_METRICS = new Set<LeaderboardMetric>(['npr', 'ppr', 'ppl', 'lr']);

/** Human labels for the ratio tab, which the API sends as bare keys. */
export const RATIO_LABELS: Record<string, string> = {
  npr: 'NPR',
  ppr: 'PPR',
  ppl: 'PPL',
  lr: 'LR',
};

export const SCOPE_LABELS: Record<string, string> = {
  personal: 'Personal',
  net_base: 'Net Base',
  smd_base: 'SMD Base',
  super_base: 'Super Base',
  super_team: 'Super Team',
};

/**
 * The director title behind a row's `level_code`, shown under the name. Falls back to
 * the raw code so an unmapped level still reads as something rather than nothing.
 */
export const LEVEL_LABELS: Record<string, string> = {
  SMD: 'Senior Marketing Director',
  MD: 'Marketing Director',
};

export function levelLabel(code: string | null | undefined): string {
  if (!code) return '';
  return LEVEL_LABELS[code] ?? code;
}

/**
 * Business-facing labels for the additive metric tabs. `recruits` reads "Business
 * Partners" the way the home card and the rest of the app already name it, rather than
 * the API's raw metric name. Falls back to the server's label for any unmapped key.
 */
export const GENERAL_METRIC_LABELS: Record<string, string> = {
  recruits: 'Business Partners',
  points: 'Points',
  licenses: 'Licenses',
  convention: 'Convention',
};

/**
 * The three first-milestone metric tabs, ranked alongside the additive metrics on the
 * standard board. Their keys are what the `/leaderboards/` endpoint ranks by.
 */
export const MILESTONE_METRICS: Array<{ key: 'rr' | 'rc' | 'rbe'; label: string }> = [
  { key: 'rr', label: '1st Recruit' },
  { key: 'rc', label: '10% Evaluation' },
  { key: 'rbe', label: 'Register for Convention' },
];

/**
 * What the period's numbers were read from, in the reader's words.
 *
 * `daily_fallback` is deliberately phrased as a fact rather than a warning: until the
 * reporting pipeline's monthly snapshot job is switched on, every closed month is
 * answered this way, and it is not an error.
 */
export const SOURCE_LABELS: Record<ResultSource, string> = {
  daily_current: 'Month to date',
  monthly_snapshot: 'Closed-month snapshot',
  daily_fallback: 'Summed from daily results',
};

/** A whole number with thousands separators. Blank input renders as a dash. */
export function formatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return numeric.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/** A metric value, formatted the way that metric is read. */
export function formatMetricValue(
  metric: LeaderboardMetric,
  value: string | number | null | undefined
): string {
  if (value === null || value === undefined || value === '') return '—';
  const formatted = formatValue(value);
  return PERCENTAGE_METRICS.has(metric) ? `${formatted}%` : formatted;
}

/** Compact `k`/`m` form for gauge axis labels, where space is tight. */
export function formatCompact(value: number): string {
  const magnitude = Math.abs(value);
  if (magnitude >= 1_000_000) return `${(value / 1_000_000).toFixed(magnitude >= 10_000_000 ? 0 : 1)}m`;
  if (magnitude >= 1_000) return `${(value / 1_000).toFixed(magnitude >= 10_000 ? 0 : 1)}k`;
  return String(Math.round(value));
}

/** `2026-03-01` → `1 Mar 2026`. Falls back to the raw string if unparseable. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Initials for an avatar placeholder. */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}
