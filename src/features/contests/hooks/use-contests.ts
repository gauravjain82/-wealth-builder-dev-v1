/**
 * React Query hooks for the WB Contests surfaces.
 *
 * The whole query — contest, filters, selected tiers, sort, cursor — is part of every
 * key, so changing any of them makes the previous response irrelevant rather than
 * merely stale. Each query forwards React Query's `signal` to `fetch`, so a
 * superseded request is actually cancelled instead of running to completion and being
 * discarded, which is what `docs/contests/ARCHITECTURE.md` §4 asks for.
 *
 * Proof, profile and flyer are `enabled`-gated on the dialog being open, so opening
 * the card does not fetch four dialogs' worth of data nobody asked for.
 *
 * The list and standings options are built once (`contestListOptions`,
 * `standingsOptions`) and shared by the hooks and the prefetches, so a prefetch always
 * lands in the entry the card will read — `docs/contests/ARCHITECTURE.md` §4.
 */

import { useEffect, useRef } from 'react';
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useWbReportingAccess, type WbReportingAccess } from '@shared/wbreporting-access';

import {
  createContest,
  deleteContest,
  fetchAgentProfile,
  fetchContests,
  fetchEditableContests,
  fetchEditorOptions,
  fetchFlyer,
  fetchProof,
  fetchStandings,
  personLabel,
  removeFlyer,
  searchPeople,
  saveContest,
  setContestHidden,
  setFlyerVisible,
  uploadFlyer,
} from '../services/contests-service';
import type {
  ContestAccess,
  FilterDraft,
  SortDirection,
  StandingsQuery,
  ThresholdMetric,
} from '../types';

const KEY = 'contests';

/** How many other contests' standings are prefetched at once. Each is ~4 server queries. */
const PREFETCH_CONCURRENCY = 2;

const selectContestAccess = (access: WbReportingAccess): ContestAccess => ({
  can_view_contests: access.can_view_contests,
  can_view_leaderboards: access.can_view_leaderboards,
  can_manage: access.can_manage,
});

/**
 * Whether the current user may see the contest surfaces.
 *
 * A selector over the shared `my-access` query (`@shared/wbreporting-access`), which
 * owns the key, the long `staleTime` and `retry: false`.
 */
export function useContestAccess() {
  return useWbReportingAccess(selectContestAccess);
}

const contestListOptions = queryOptions({
  queryKey: [KEY, 'list'],
  queryFn: ({ signal }) => fetchContests(signal),
  staleTime: 60 * 1000,
});

function standingsOptions(query: StandingsQuery) {
  return queryOptions({
    queryKey: [KEY, 'standings', query],
    queryFn: ({ signal }) => fetchStandings(query, signal),
    // Standings move only when the pipeline rebuilds, which is at most daily; a
    // short window avoids refetching the whole page on every tier toggle round-trip.
    staleTime: 30 * 1000,
  });
}

/**
 * The one place a standings query is composed.
 *
 * The card calls it for what it shows and the prefetch calls it for what a contest
 * switch will show, so the two cannot drift: a key that differs by one field is a
 * silent cache miss, and the switch goes back to the network.
 */
export function buildStandingsQuery(input: {
  filters: FilterDraft;
  contestId: number;
  tierIds: number[];
  sortTier: number | null;
  direction: SortDirection;
}): StandingsQuery {
  return {
    ...input.filters,
    contestId: input.contestId,
    tierIds: input.tierIds,
    sortTier: input.sortTier,
    direction: input.direction,
  };
}

/** Readable contests for the selector. */
export function useContests() {
  return useQuery(contestListOptions);
}

/**
 * Start the contest list alongside the route's access check instead of after it.
 *
 * The guard renders nothing until access resolves, so the card's `useContests()`
 * would otherwise start one round trip late. The same options mean the card finds
 * this request in flight rather than sending its own. Safe for an ungranted caller:
 * the backend answers 403 and the guard redirects.
 */
export function usePrefetchContests() {
  const queryClient = useQueryClient();
  useEffect(() => {
    void queryClient.prefetchQuery(contestListOptions);
  }, [queryClient]);
}

/** One prepared page of standings. */
export function useStandings(query: StandingsQuery | null) {
  return useQuery({
    ...standingsOptions(query as StandingsQuery),
    enabled: query !== null,
  });
}

/**
 * Warm the cache for a switch to any other contest, a couple at a time.
 *
 * Each key is exactly what the card composes after a switch: the applied filters and
 * direction carried over, tiers and sort tier reset (`buildStandingsQuery`). When the
 * filters or direction change, the old prefetches are for keys nobody will read, so
 * the effect starts over for the new ones and cancels any old one still in flight
 * that nothing is showing. A contest switch alone does not restart it: the contest
 * shown when it started is skipped, and every other entry is already warm or on its way.
 */
export function usePrefetchOtherStandings(input: {
  enabled: boolean;
  contestIds: number[];
  activeContestId: number | null;
  filters: FilterDraft;
  direction: SortDirection;
}) {
  const queryClient = useQueryClient();
  const { enabled, filters, direction } = input;
  const idsKey = input.contestIds.join(',');
  const activeContestId = useRef(input.activeContestId);
  activeContestId.current = input.activeContestId;

  useEffect(() => {
    if (!enabled) return;
    const pending = idsKey
      .split(',')
      .map(Number)
      .filter((id) => id && id !== activeContestId.current)
      .map((contestId) =>
        standingsOptions(
          buildStandingsQuery({ filters, contestId, tierIds: [], sortTier: null, direction })
        )
      );
    let stopped = false;
    const started: Array<ReturnType<typeof standingsOptions>> = [];

    const worker = async () => {
      for (let next = pending.shift(); next && !stopped; next = pending.shift()) {
        started.push(next);
        // prefetchQuery never throws, and is a no-op while the entry is fresh.
        await queryClient.prefetchQuery(next);
      }
    };
    for (let i = 0; i < PREFETCH_CONCURRENCY; i += 1) void worker();

    return () => {
      stopped = true;
      for (const options of started) {
        const query = queryClient.getQueryCache().find({ queryKey: options.queryKey, exact: true });
        if (query?.state.fetchStatus === 'fetching' && query.getObserversCount() === 0) {
          void queryClient.cancelQueries({ queryKey: options.queryKey, exact: true });
        }
      }
    };
  }, [queryClient, enabled, idsKey, filters, direction]);
}

export { personLabel };

function personSearchOptions(term: string) {
  return queryOptions({
    queryKey: [KEY, 'people', term],
    queryFn: ({ signal }) => searchPeople(term, signal),
    // People and their codes change rarely; a minute spares a re-search while typing back.
    staleTime: 60 * 1000,
  });
}

/** Suggestions for the person search, once there is something to search for. */
export function usePersonSearch(term: string) {
  const trimmed = term.trim();
  return useQuery({ ...personSearchOptions(trimmed), enabled: trimmed.length > 0 });
}

/**
 * Resolve typed text to people on Apply, from the suggestions' cache when it has them.
 *
 * dtez applies on Enter with whatever was typed, so Apply cannot wait for the debounced
 * suggestions: it asks for the same entry, which is already there when they arrived.
 */
export function useFindPeople() {
  const queryClient = useQueryClient();
  return (term: string) => queryClient.fetchQuery(personSearchOptions(term.trim()));
}

/** The proof rows behind one cell, fetched only once its dialog opens. */
export function useProof(
  input: {
    contestId: number;
    tierId: number;
    agentId: number;
    metric: ThresholdMetric;
  } | null
) {
  return useQuery({
    queryKey: [KEY, 'proof', input],
    queryFn: ({ signal }) => fetchProof(input!, signal),
    enabled: input !== null,
  });
}

/** One agent's profile, fetched only once its dialog opens. */
export function useAgentProfile(input: { contestId: number; agentId: number } | null) {
  return useQuery({
    queryKey: [KEY, 'profile', input],
    queryFn: ({ signal }) => fetchAgentProfile(input!, signal),
    enabled: input !== null,
    retry: false,
  });
}

/**
 * The flyer's short-lived URL, fetched only once its dialog opens.
 *
 * `staleTime` is under the server's 15-minute signed-URL lifetime, so a dialog
 * reopened much later re-signs rather than rendering a link that has expired.
 */
export function useFlyer(contestId: number | null) {
  return useQuery({
    queryKey: [KEY, 'flyer', contestId],
    queryFn: ({ signal }) => fetchFlyer(contestId!, signal),
    enabled: contestId !== null,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}

/* --- settings (wbreporting:manage) ---------------------------------------- */

/** Editor metadata: levels, metrics, statuses, period modes, flyer limits. */
export function useEditorOptions(enabled: boolean) {
  return useQuery({
    queryKey: [KEY, 'editor-options'],
    queryFn: ({ signal }) => fetchEditorOptions(signal),
    enabled,
    // Host facts that change when an operator edits the level table, not per render.
    staleTime: 5 * 60 * 1000,
  });
}

/** Every editable contest, with the revision tokens a save needs. */
export function useEditableContests(enabled: boolean) {
  return useQuery({
    queryKey: [KEY, 'editable'],
    queryFn: ({ signal }) => fetchEditableContests(signal),
    enabled,
  });
}

/**
 * Every settings mutation, sharing one invalidation.
 *
 * All of them return the contest's fresh editor payload, and all of them advance a
 * `revision`. Re-reading the list after any write is what keeps the editor's tokens
 * current — a stale token is a 409 on the next save, which is correct but useless to
 * a user who only pressed "Hide".
 */
export function useContestSettingsMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [KEY, 'editable'] });
    // The reader surfaces show the same contests; a rename or a hide must reach them.
    queryClient.invalidateQueries({ queryKey: [KEY, 'list'] });
    queryClient.invalidateQueries({ queryKey: [KEY, 'standings'] });
  };

  return {
    create: useMutation({ mutationFn: createContest, onSuccess: invalidate }),
    save: useMutation({
      mutationFn: (input: { contestId: number; body: Record<string, unknown> }) =>
        saveContest(input.contestId, input.body),
      onSuccess: invalidate,
    }),
    setHidden: useMutation({
      mutationFn: (input: { contestId: number; hidden: boolean; revision: number }) =>
        setContestHidden(input.contestId, {
          hidden: input.hidden,
          revision: input.revision,
        }),
      onSuccess: invalidate,
    }),
    setFlyerVisible: useMutation({
      mutationFn: (input: { contestId: number; visible: boolean; revision: number }) =>
        setFlyerVisible(input.contestId, {
          visible: input.visible,
          revision: input.revision,
        }),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (input: { contestId: number; revision: number }) =>
        deleteContest(input.contestId, input.revision),
      onSuccess: invalidate,
    }),
    uploadFlyer: useMutation({
      mutationFn: (input: { contestId: number; file: File; revision: number }) =>
        uploadFlyer(input.contestId, input.file, input.revision),
      onSuccess: invalidate,
    }),
    removeFlyer: useMutation({
      mutationFn: (input: { contestId: number; revision: number }) =>
        removeFlyer(input.contestId, input.revision),
      onSuccess: invalidate,
    }),
  };
}
