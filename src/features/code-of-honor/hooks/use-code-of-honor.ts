/**
 * React Query hooks for the Code of Honor wall.
 *
 * Queries pass React Query's `signal` to the service, so a superseded request (a newer
 * member search, a poll that overlaps a like) is aborted and its late answer discarded.
 * The like mutation writes the server's returned feed straight into the vote cache —
 * one source of truth, so counts and order never flicker between an optimistic guess
 * and a poll.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from '../services/code-of-honor-service';
import type { AdminSettings, AdminValue, ReviewAction, SubmitPayload } from '../types';

const ROOT = 'code-of-honor';
export const cohKeys = {
  access: [ROOT, 'my-access'] as const,
  state: [ROOT, 'state'] as const,
  wall: [ROOT, 'wall'] as const,
  members: (q: string) => [ROOT, 'members', q] as const,
  vote: [ROOT, 'vote'] as const,
  results: (cycle: string | null) => [ROOT, 'results', cycle] as const,
  leaderboard: (year: number | null) => [ROOT, 'leaderboard', year] as const,
  review: (cycle: string | null) => [ROOT, 'review', cycle] as const,
  audit: (cycle: string) => [ROOT, 'audit', cycle] as const,
  adminSettings: [ROOT, 'admin-settings'] as const,
  adminValues: [ROOT, 'admin-values'] as const,
};

/** Polling interval for the live vote, matching the reference interface. */
export const VOTE_POLL_MS = 4000;

/** Capabilities for the menu, route guard and card (never 403s). */
export function useCodeOfHonorAccess() {
  return useQuery({
    queryKey: cohKeys.access,
    queryFn: ({ signal }) => api.fetchMyAccess(signal),
    staleTime: 5 * 60 * 1000,
  });
}

export function useWallState(enabled = true) {
  return useQuery({ queryKey: cohKeys.state, queryFn: ({ signal }) => api.fetchState(signal), enabled });
}

export function useWall(enabled = true) {
  return useQuery({ queryKey: cohKeys.wall, queryFn: ({ signal }) => api.fetchWall(signal), enabled });
}

/** Teammate search; idle below two characters (the server returns nothing there anyway). */
export function useMemberSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: cohKeys.members(q),
    queryFn: ({ signal }) => api.searchMembers(q, signal),
    enabled: q.length >= 2,
    staleTime: 30 * 1000,
  });
}

export function usePreviewAct() {
  return useMutation({
    mutationFn: ({ nomineeId, text }: { nomineeId: string; text: string }) => api.previewAct(nomineeId, text),
  });
}

export function useSubmitAct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitPayload) => api.submitAct(payload),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: cohKeys.wall });
    },
  });
}

/** The live vote; polls while `live` and the browser tab is visible. */
export function useVoteFeed(enabled: boolean, live: boolean) {
  return useQuery({
    queryKey: cohKeys.vote,
    queryFn: ({ signal }) => api.fetchVote(signal),
    enabled,
    refetchInterval: live ? VOTE_POLL_MS : false,
    refetchIntervalInBackground: false,
  });
}

export function useLike() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ actId, liked }: { actId: string; liked: boolean }) => api.setLike(actId, liked),
    onSuccess: (feed) => {
      client.cancelQueries({ queryKey: cohKeys.vote });
      client.setQueryData(cohKeys.vote, feed);
    },
  });
}

export function useResults(cycle: string | null, enabled = true) {
  return useQuery({
    queryKey: cohKeys.results(cycle),
    queryFn: ({ signal }) => api.fetchResults(cycle, signal),
    enabled,
  });
}

export function useCoinLeaderboard(year: number | null, enabled = true) {
  return useQuery({
    queryKey: cohKeys.leaderboard(year),
    queryFn: ({ signal }) => api.fetchLeaderboard(year, signal),
    enabled,
  });
}

/* --- committee ------------------------------------------------------------ */

export function useReview(cycle: string | null) {
  return useQuery({ queryKey: cohKeys.review(cycle), queryFn: ({ signal }) => api.fetchReview(cycle, signal) });
}

export function useAudit(cycle: string | null) {
  return useQuery({
    queryKey: cohKeys.audit(cycle ?? ''),
    queryFn: ({ signal }) => api.fetchAudit(cycle as string, signal),
    enabled: Boolean(cycle),
  });
}

/** Refresh everything a committee action can change. */
function useInvalidateWall() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: [ROOT] });
}

export function useReviewAct() {
  const invalidate = useInvalidateWall();
  return useMutation({
    mutationFn: ({ actId, action }: { actId: string; action: ReviewAction }) => api.reviewAct(actId, action),
    onSuccess: invalidate,
  });
}

export function useCycleAction() {
  const invalidate = useInvalidateWall();
  return useMutation({
    mutationFn: ({ cycleId, kind }: { cycleId: string; kind: 'open-voting' | 'runoff' | 'complete' }) =>
      kind === 'open-voting'
        ? api.openVoting(cycleId)
        : kind === 'runoff'
          ? api.startRunoff(cycleId)
          : api.completeCycle(cycleId),
    onSuccess: invalidate,
  });
}

export function useTieDecision() {
  const invalidate = useInvalidateWall();
  return useMutation({
    mutationFn: ({ cycleId, actIds, reason }: { cycleId: string; actIds: string[]; reason: string }) =>
      api.recordTieDecision(cycleId, actIds, reason),
    // A further tie answers 409 but the decision was kept, so refresh either way.
    onSettled: invalidate,
  });
}

/* --- admin ---------------------------------------------------------------- */

export function useAdminSettings() {
  return useQuery({ queryKey: cohKeys.adminSettings, queryFn: ({ signal }) => api.fetchAdminSettings(signal) });
}

export function useSaveAdminSettings() {
  const invalidate = useInvalidateWall();
  return useMutation({
    mutationFn: (changes: Partial<AdminSettings>) => api.saveAdminSettings(changes),
    onSuccess: invalidate,
  });
}

export function useAdminValues() {
  return useQuery({ queryKey: cohKeys.adminValues, queryFn: ({ signal }) => api.fetchAdminValues(signal) });
}

export function useSaveAdminValue() {
  const invalidate = useInvalidateWall();
  return useMutation({
    mutationFn: (value: Partial<AdminValue> & { key: string }) => api.saveAdminValue(value),
    onSuccess: invalidate,
  });
}
