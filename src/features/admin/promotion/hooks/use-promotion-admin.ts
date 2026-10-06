/** React Query hooks for Promotion Management (/admin/promotion). */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { DASHBOARD_QUERY_KEY } from '@/features/promotion/hooks/use-promotion-dashboard';
import { useToastStore } from '@/store';
import { fetchPromotionContent, reorder } from '../services/promotion-admin-service';
import type { AdminTrack, ReorderKind } from '../types';

export const PROMOTION_CONTENT_QUERY_KEY = ['promotion-admin', 'tracks'] as const;

/** The full content tree. Small (a handful of tracks), so it is loaded whole. */
export function usePromotionContent() {
  return useQuery({
    queryKey: PROMOTION_CONTENT_QUERY_KEY,
    queryFn: ({ signal }) => fetchPromotionContent(signal),
  });
}

/**
 * Refetch the admin tree and the learner views that render the same content, so an
 * admin who opens their own dashboard next sees the edit rather than a cached copy.
 */
function useInvalidateContent() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: PROMOTION_CONTENT_QUERY_KEY }),
      client.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY }),
      client.invalidateQueries({ queryKey: ['promotion-team'] }),
    ]);
}

/**
 * Wrap a create/update/delete call: toast the outcome, refetch on success. Resolves to
 * `true` on success so a modal knows whether to close.
 */
export function useContentAction() {
  const invalidate = useInvalidateContent();
  const { addToast } = useToastStore();
  return async (action: () => Promise<unknown>, successMessage: string) => {
    try {
      await action();
      addToast({ message: successMessage, type: 'success' });
      await invalidate();
      return true;
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : 'Something went wrong',
        type: 'error',
      });
      return false;
    }
  };
}

/** Rewrite the order of every child under `parentId`, in `ids` order. */
function reorderIn(tracks: AdminTrack[], kind: ReorderKind, parentId: number, ids: number[]) {
  const sortBy = <T extends { id: number; order: number }>(rows: T[]) =>
    ids
      .map((id) => rows.find((row) => row.id === id))
      .filter((row): row is T => row !== undefined)
      .map((row, order) => ({ ...row, order }));

  return tracks.map((track) => {
    if (kind === 'skills') {
      return track.id === parentId ? { ...track, skills: sortBy(track.skills) } : track;
    }
    return {
      ...track,
      skills: track.skills.map((skill) => {
        if (kind === 'modules') {
          return skill.id === parentId ? { ...skill, modules: sortBy(skill.modules) } : skill;
        }
        return {
          ...skill,
          modules: skill.modules.map((video) =>
            video.id === parentId
              ? { ...video, quiz_questions: sortBy(video.quiz_questions) }
              : video
          ),
        };
      }),
    };
  });
}

/**
 * Drag-to-reorder. The new order is written into the cache first, so the row stays
 * where it was dropped instead of snapping back for a round trip; a failure restores
 * the previous order.
 */
export function useReorder() {
  const client = useQueryClient();
  const invalidate = useInvalidateContent();
  const { addToast } = useToastStore();

  return useMutation({
    mutationFn: ({ kind, ids }: { kind: ReorderKind; parentId: number; ids: number[] }) =>
      reorder(kind, ids),
    onMutate: async ({ kind, parentId, ids }) => {
      await client.cancelQueries({ queryKey: PROMOTION_CONTENT_QUERY_KEY });
      const previous = client.getQueryData<AdminTrack[]>(PROMOTION_CONTENT_QUERY_KEY);
      if (previous) {
        client.setQueryData(PROMOTION_CONTENT_QUERY_KEY, reorderIn(previous, kind, parentId, ids));
      }
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) client.setQueryData(PROMOTION_CONTENT_QUERY_KEY, context.previous);
      addToast({
        message: err instanceof Error ? err.message : 'Could not save the new order',
        type: 'error',
      });
    },
    onSettled: () => invalidate(),
  });
}
