/** React Query hooks for the Match Up metrics drill-down. */

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { matchupMetricsService } from '../services/metrics-service';
import type { MetricsQuery } from '../types';

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
    queryFn: matchupMetricsService.access,
    staleTime: 5 * 60 * 1000,
  });
}

/** The report for the deepest drilled level above the prospect journey. */
export function useMetricsReport(path: DrillPath, query: MetricsQuery, enabled = true) {
  return useQuery({
    queryKey: ['matchup-metrics', 'report', path.smd, path.agent, query],
    queryFn: () => {
      if (path.agent != null) return matchupMetricsService.agent(path.agent, query);
      if (path.smd !== undefined) return matchupMetricsService.smd(path.smd, query);
      return matchupMetricsService.organisation(query);
    },
    enabled: enabled && path.prospect == null,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}

/** A single prospect's appointment journey. */
export function useProspectJourney(prospectId: number | undefined, query: MetricsQuery) {
  return useQuery({
    queryKey: ['matchup-metrics', 'prospect', prospectId, query],
    queryFn: () => matchupMetricsService.prospect(prospectId as number, query),
    enabled: prospectId != null,
    staleTime: STALE_MS,
  });
}
