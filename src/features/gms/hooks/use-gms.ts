/**
 * React Query hooks for the Guidance surfaces.
 *
 * Prerequisites are deliberately **not** cached for long. They are evaluated live on the
 * server against the user's permissions and the tool's current state, and a pre-start
 * panel showing a stale pass would let somebody start a walkthrough that cannot succeed.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  completeWalkthrough,
  endWalkthrough,
  fetchGmsAccess,
  fetchHelpContext,
  fetchTopic,
  fetchWalkthrough,
  restartWalkthrough,
  saveFeedback,
  startWalkthrough,
} from '../services/gms-service';

/** Capability flags. Cached like the other `my-access` calls in this app. */
export function useGmsAccess() {
  return useQuery({
    queryKey: ['gms', 'access'],
    queryFn: ({ signal }) => fetchGmsAccess(signal),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

/** What Help is relevant here. Enabled only once a tool is known. */
export function useHelpContext(tool: string | null, location?: string) {
  return useQuery({
    queryKey: ['gms', 'context', tool, location ?? null],
    queryFn: ({ signal }) => fetchHelpContext(tool as string, location, signal),
    enabled: Boolean(tool),
    staleTime: 60 * 1000,
  });
}

/** One topic's content. Enabled only while its panel is open. */
export function useTopic(toolKey: string | null, topicKey: string | null) {
  return useQuery({
    queryKey: ['gms', 'topic', toolKey, topicKey],
    queryFn: ({ signal }) => fetchTopic(toolKey as string, topicKey as string, signal),
    enabled: Boolean(toolKey && topicKey),
  });
}

/**
 * The pre-start panel.
 *
 * `staleTime: 0` on purpose: prerequisites reflect live permissions and live tool state,
 * and this panel is what decides whether Start is offered.
 */
export function useWalkthrough(
  toolKey: string | null,
  topicKey: string | null,
  contextIds: Record<string, number> = {}
) {
  return useQuery({
    queryKey: ['gms', 'walkthrough', toolKey, topicKey, contextIds],
    queryFn: ({ signal }) =>
      fetchWalkthrough(toolKey as string, topicKey as string, contextIds, signal),
    enabled: Boolean(toolKey && topicKey),
    staleTime: 0,
  });
}

/** Start, restart, end and complete, each invalidating the panel that shows state. */
export function useWalkthroughActions(toolKey: string, topicKey: string) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['gms', 'walkthrough', toolKey, topicKey],
    });

  const start = useMutation({
    mutationFn: (variables: {
      contextIds?: Record<string, number>;
      isPreview?: boolean;
    }) =>
      startWalkthrough(
        toolKey,
        topicKey,
        variables.contextIds ?? {},
        variables.isPreview ?? false
      ),
    onSuccess: invalidate,
  });

  const restart = useMutation({
    mutationFn: (contextIds: Record<string, number> = {}) =>
      restartWalkthrough(toolKey, topicKey, contextIds),
    onSuccess: invalidate,
  });

  const end = useMutation({
    mutationFn: (reason: string = '') => endWalkthrough(toolKey, topicKey, reason),
    onSuccess: invalidate,
  });

  const complete = useMutation({
    mutationFn: (signal: string) => completeWalkthrough(toolKey, topicKey, signal),
    onSuccess: invalidate,
  });

  return { start, restart, end, complete };
}

/** One editable rating per user per version. */
export function useSaveFeedback(toolKey: string, topicKey: string) {
  return useMutation({
    mutationFn: (variables: { rating: number; comment: string }) =>
      saveFeedback(toolKey, topicKey, variables.rating, variables.comment),
  });
}
