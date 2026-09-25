/**
 * React Query hooks for the WB Leaderboards surfaces.
 *
 * The selection is part of every query key, so changing scope, metric or range makes
 * the old response irrelevant rather than merely stale — which is what
 * `UI_CONTRACT.md` means by discarding stale responses. Each query forwards React
 * Query's `signal` to `fetch`, so the superseded request is actually cancelled
 * instead of running to completion and being thrown away.
 */

import { useQuery } from '@tanstack/react-query';

import {
  fetchFullReport,
  fetchLeaderboard,
  fetchLeaderboardAccess,
  fetchLeaderboardCard,
  fetchLeaderboardDetail,
} from '../services/leaderboards-service';
import type { LeaderboardSelection, Scope } from '../types';

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

/**
 * Whether the current user may see the leaderboards and the Home v2 page.
 *
 * Long `staleTime`: an access-console grant is not something that changes while
 * somebody is looking at a page, and the route guard blocks rendering until it
 * resolves, so re-fetching it costs a visible loader for no benefit.
 */
export function useLeaderboardAccess() {
  return useQuery({
    queryKey: [KEY, 'my-access'],
    queryFn: ({ signal }) => fetchLeaderboardAccess(signal),
    staleTime: 5 * 60 * 1000,
  });
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
