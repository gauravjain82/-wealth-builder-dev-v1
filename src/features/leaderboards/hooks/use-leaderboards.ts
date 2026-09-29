/**
 * React Query hooks for the WB Leaderboards surfaces.
 *
 * The selection is part of every query key, so changing scope, metric or range makes
 * the old response irrelevant rather than merely stale — which is what
 * `docs/leaderboards/ARCHITECTURE.md` §4 means by discarding stale responses. Each
 * query forwards React Query's `signal` to `fetch`, so the superseded request is
 * actually cancelled
 * instead of running to completion and being thrown away.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useWbReportingAccess, type WbReportingAccess } from '@shared/wbreporting-access';

import {
  fetchDateRanges,
  fetchDisplaySettings,
  fetchFullReport,
  fetchLeaderboard,
  fetchLeaderboardCard,
  fetchLeaderboardDetail,
  fetchLeaderboardGoals,
  saveDateRange,
  saveDisplaySettings,
  saveLeaderboardGoals,
} from '../services/leaderboards-service';
import type {
  LeaderboardAccess,
  LeaderboardDateRange,
  LeaderboardSelection,
  Scope,
} from '../types';

const KEY = 'leaderboards';

/** Stable, order-independent identity for a selection. */
function selectionKey(selection: LeaderboardSelection) {
  return {
    metric: selection.metric,
    scope: selection.scope,
    rangeKey: selection.rangeKey,
    start: selection.start ?? null,
    end: selection.end ?? null,
  };
}

const selectLeaderboardAccess = (access: WbReportingAccess): LeaderboardAccess => ({
  can_view: access.can_view,
  can_manage: access.can_manage,
  can_view_leaderboards: access.can_view_leaderboards,
});

/**
 * Whether the current user may see the leaderboards and the Home v2 page.
 *
 * A selector over the shared `my-access` query (`@shared/wbreporting-access`), which
 * owns the key and the long `staleTime`. It is outside `['leaderboards']`, so the
 * settings mutations' wholesale invalidation no longer refetches access — a settings
 * save does not change a grant.
 */
export function useLeaderboardAccess() {
  return useWbReportingAccess(selectLeaderboardAccess);
}

/** The compact card payload for the home page. */
export function useLeaderboardCard(selection: LeaderboardSelection) {
  return useQuery({
    queryKey: [KEY, 'card', selectionKey(selection)],
    queryFn: ({ signal }) => fetchLeaderboardCard(selection, signal),
    staleTime: 60 * 1000,
  });
}

/** The expanded leaderboard for a selection. */
export function useLeaderboard(selection: LeaderboardSelection, enabled = true) {
  return useQuery({
    queryKey: [KEY, 'board', selectionKey(selection)],
    queryFn: ({ signal }) => fetchLeaderboard(selection, signal),
    enabled,
    staleTime: 60 * 1000,
  });
}

/** The Full Report for a month (omit `month` for the current month to date). */
export function useFullReport(input: { month?: string; scope: Scope }, enabled = true) {
  return useQuery({
    queryKey: [KEY, 'full', input.month ?? 'current', input.scope],
    queryFn: ({ signal }) => fetchFullReport(input, signal),
    enabled,
    staleTime: 60 * 1000,
  });
}

/**
 * Proof rows behind one number.
 *
 * `enabled` is how the modal keeps its promise to open immediately: it renders with a
 * loading state and this query only starts once an agent and metric are actually
 * selected, so opening the dialog never waits on a request.
 */
export function useLeaderboardDetail(
  input: (LeaderboardSelection & { agentId: string; detailMetric: string; cursor?: string }) | null
) {
  return useQuery({
    queryKey: input
      ? [KEY, 'detail', input.agentId, input.detailMetric, selectionKey(input), input.cursor ?? null]
      : [KEY, 'detail', 'idle'],
    queryFn: ({ signal }) => fetchLeaderboardDetail(input!, signal),
    enabled: Boolean(input),
    staleTime: 30 * 1000,
  });
}

/* --- settings ------------------------------------------------------------ */

/**
 * Settings reads and writes.
 *
 * Every mutation invalidates the leaderboard queries as well as its own: changing a
 * goal moves the Full Report's gauges, and switching Net Base on changes which scopes
 * the expanded view may offer. Leaving the board cached would show the old answer
 * until it went stale on its own.
 */
export function useLeaderboardGoals() {
  return useQuery({
    queryKey: [KEY, 'goals'],
    queryFn: ({ signal }) => fetchLeaderboardGoals(signal),
  });
}

export function useSaveLeaderboardGoals() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveLeaderboardGoals,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDisplaySettings() {
  return useQuery({
    queryKey: [KEY, 'display-settings'],
    queryFn: ({ signal }) => fetchDisplaySettings(signal),
  });
}

export function useSaveDisplaySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveDisplaySettings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDateRanges() {
  return useQuery({
    queryKey: [KEY, 'date-ranges'],
    queryFn: ({ signal }) => fetchDateRanges(signal),
  });
}

export function useSaveDateRange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { rangeKey: string; patch: Partial<LeaderboardDateRange> }) =>
      saveDateRange(input.rangeKey, input.patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });
}
