/**
 * React Query hooks for the WB Contests surfaces.
 *
 * The whole query — contest, filters, selected tiers, sort, cursor — is part of every
 * key, so changing any of them makes the previous response irrelevant rather than
 * merely stale. Each query forwards React Query's `signal` to `fetch`, so a
 * superseded request is actually cancelled instead of running to completion and being
 * discarded, which is what `UI_CONTRACT.md` asks for.
 *
 * Proof, profile and flyer are `enabled`-gated on the dialog being open, so opening
 * the card does not fetch four dialogs' worth of data nobody asked for.
 */

import { useQuery } from '@tanstack/react-query';

import {
  fetchAgentProfile,
  fetchContestAccess,
  fetchContests,
  fetchFlyer,
  fetchProof,
  fetchStandings,
} from '../services/contests-service';
import type { StandingsQuery, ThresholdMetric } from '../types';

const KEY = 'contests';

/**
 * Whether the current user may see the contest surfaces.
 *
 * Long `staleTime`: an access-console grant does not change while somebody is looking
 * at a page, and the route guard blocks rendering until it resolves, so re-fetching
 * costs a visible loader for no benefit.
 */
export function useContestAccess() {
  return useQuery({
    queryKey: [KEY, 'my-access'],
    queryFn: ({ signal }) => fetchContestAccess(signal),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

/** Readable contests for the selector. */
export function useContests() {
  return useQuery({
    queryKey: [KEY, 'list'],
    queryFn: ({ signal }) => fetchContests(signal),
    staleTime: 60 * 1000,
  });
}

/** One prepared page of standings. */
export function useStandings(query: StandingsQuery | null) {
  return useQuery({
    queryKey: [KEY, 'standings', query],
    queryFn: ({ signal }) => fetchStandings(query as StandingsQuery, signal),
    enabled: query !== null,
    // Standings move only when the pipeline rebuilds, which is at most daily; a
    // short window avoids refetching the whole page on every tier toggle round-trip.
    staleTime: 30 * 1000,
  });
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
