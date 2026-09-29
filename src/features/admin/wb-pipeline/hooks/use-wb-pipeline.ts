/** React Query hooks for the WB reporting pipeline admin screen. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useWbReportingAccess, type WbReportingAccess } from '@shared/wbreporting-access';

import {
  fetchPipelineRuns,
  fetchPipelineStatus,
  rebuildMonthly,
  recalculateDaily,
  runCapabilityCheck,
} from '../services/wb-pipeline-service';
import type {
  PipelineAccess,
  PipelineJobName,
  PipelineRunStatus,
  RebuildMonthlyRequest,
  RecalculateDailyRequest,
} from '../types';

const KEY = 'wb-pipeline';

const selectPipelineAccess = (access: WbReportingAccess): PipelineAccess => ({
  can_view: access.can_view,
  can_manage: access.can_manage,
});

/**
 * Whether the current user may view, and whether they may trigger jobs.
 *
 * A selector over the shared `my-access` query (`@shared/wbreporting-access`), which
 * owns the cache policy.
 */
export function usePipelineAccess() {
  return useWbReportingAccess(selectPipelineAccess);
}

/**
 * Latest run per job plus anything in flight.
 *
 * Polls every 10 seconds while a run is live so a queued job visibly progresses,
 * and stops polling once everything has finished.
 */
export function usePipelineStatus() {
  return useQuery({
    queryKey: [KEY, 'status'],
    queryFn: fetchPipelineStatus,
    refetchInterval: (query) => (query.state.data?.running.length ? 10_000 : false),
  });
}

export function usePipelineRuns(filters: {
  job?: PipelineJobName | '';
  status?: PipelineRunStatus | '';
  limit?: number;
}) {
  return useQuery({
    queryKey: [KEY, 'runs', filters],
    queryFn: () => fetchPipelineRuns(filters),
  });
}

/** The capability check is explicit, not automatic: it is a button, not a poll. */
export function useCapabilityCheck() {
  return useMutation({ mutationFn: runCapabilityCheck });
}

/** Invalidates status and history so a queued run appears without a manual reload. */
function useJobTrigger<TRequest>(mutationFn: (request: TRequest) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY, 'status'] });
      queryClient.invalidateQueries({ queryKey: [KEY, 'runs'] });
    },
  });
}

export function useRecalculateDaily() {
  return useJobTrigger<RecalculateDailyRequest>(recalculateDaily);
}

export function useRebuildMonthly() {
  return useJobTrigger<RebuildMonthlyRequest>(rebuildMonthly);
}
