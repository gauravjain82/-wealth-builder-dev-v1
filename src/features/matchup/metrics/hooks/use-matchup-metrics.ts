/** React Query hooks for the Match Up metrics drill-down. */

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { matchupMetricsService } from '../services/metrics-service';
import type { MetricsQuery, TrendQuery } from '../types';

const STALE_MS = 2 * 60 * 1000;

/** Where the viewer currently is in the drill-down. */
export interface DrillPath {
  /** undefined = not drilled into an SMD; null = the "No SMD" group. */
  smd?: number | null;
  agent?: number;
  prospect?: number;
}

/** Capability flag for the route guard and the Matchup page button. */
export function useMatchupMetricsAccess() {
  return useQuery({
    queryKey: ['matchup-metrics', 'my-access'],
    queryFn: ({ signal }) => matchupMetricsService.access(signal),
    staleTime: 5 * 60 * 1000,
  });
}

function fetchReport(path: DrillPath, query: MetricsQuery, signal: AbortSignal) {
  if (path.agent != null) return matchupMetricsService.agent(path.agent, query, signal);
  if (path.smd !== undefined) return matchupMetricsService.smd(path.smd, query, signal);
  return matchupMetricsService.organisation(query, signal);
}

/** The report for the deepest drilled level above the prospect journey. */
export function useMetricsReport(path: DrillPath, query: MetricsQuery, enabled = true) {
  return useQuery({
    queryKey: ['matchup-metrics', 'report', path.smd, path.agent, query],
    queryFn: ({ signal }) => fetchReport(path, query, signal),
    enabled: enabled && path.prospect == null,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}

function shiftDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

/**
 * The window of equal length that ends the day before `query.start`. Both
 * ends are inclusive on the backend (`MetricsWindow`), so a 61-day window
 * compares with the 61 days before it.
 */
export function previousWindow(query: MetricsQuery): MetricsQuery {
  const [sy, sm, sd] = query.start.split('-').map(Number);
  const [ey, em, ed] = query.end.split('-').map(Number);
  const spanDays = Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / 86_400_000);
  const end = shiftDays(query.start, -1);
  return { ...query, start: shiftDays(end, -spanDays), end };
}

/**
 * The same level and filters over the previous window, for the hero's
 * deltas. No placeholder data: a delta against another selection's
 * baseline would be wrong, so the deltas wait for this instead.
 */
export function usePreviousReport(path: DrillPath, query: MetricsQuery, enabled = true) {
  const previous = previousWindow(query);
  return useQuery({
    queryKey: ['matchup-metrics', 'report', path.smd, path.agent, previous],
    queryFn: ({ signal }) => fetchReport(path, previous, signal),
    enabled: enabled && path.prospect == null,
    staleTime: STALE_MS,
  });
}

/** Weeks of history behind every sparkline. */
export const TREND_WEEKS = 12;

function fetchTrend(path: DrillPath, query: TrendQuery, signal: AbortSignal) {
  if (path.agent != null) return matchupMetricsService.trendAgent(path.agent, query, signal);
  if (path.smd !== undefined) return matchupMetricsService.trendSmd(path.smd, query, signal);
  return matchupMetricsService.trendOrganisation(query, signal);
}

/**
 * Weekly series for the hero sparklines and the rows table's Trend column,
 * for the `TREND_WEEKS` ISO weeks ending with the week containing
 * `query.end`. `start` is not part of the key: the backend ignores it.
 *
 * `data` is null when the trend endpoint is not deployed (404). No
 * placeholder data — a sparkline for the last selection would be wrong — and
 * no retry, since a missing or failing trend only means no sparklines.
 */
export function useMetricsTrend(path: DrillPath, query: MetricsQuery, enabled = true) {
  const trendQuery: TrendQuery = { end: query.end, mode: query.mode, segment: query.segment, weeks: TREND_WEEKS };
  return useQuery({
    queryKey: ['matchup-metrics', 'trend', path.smd, path.agent, trendQuery],
    queryFn: ({ signal }) => fetchTrend(path, trendQuery, signal),
    enabled: enabled && path.prospect == null,
    staleTime: STALE_MS,
    retry: false,
  });
}

/** A single prospect's appointment journey. */
export function useProspectJourney(prospectId: number | undefined, query: MetricsQuery) {
  return useQuery({
    queryKey: ['matchup-metrics', 'prospect', prospectId, query],
    queryFn: ({ signal }) => matchupMetricsService.prospect(prospectId as number, query, signal),
    enabled: prospectId != null,
    staleTime: STALE_MS,
  });
}
