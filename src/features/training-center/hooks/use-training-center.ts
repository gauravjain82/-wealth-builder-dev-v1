import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  completeTrainingItem,
  fetchTrainingCenter,
} from '../services/training-center-service';
import type { CompleteTrainingItemResponse, TrainingCenterResponse } from '../types';

export const TRAINING_CENTER_QUERY_KEY = ['training-center'] as const;

export function useTrainingCenter() {
  return useQuery({
    queryKey: TRAINING_CENTER_QUERY_KEY,
    queryFn: fetchTrainingCenter,
    staleTime: 0,
  });
}

/**
 * Award XP for a module.
 *
 * The response carries authoritative progress, so it is written straight into
 * the cached page payload instead of triggering a refetch. That keeps the XP
 * counters and achievement popup instant.
 */
export function useCompleteTrainingItem() {
  const queryClient = useQueryClient();

  return useMutation<CompleteTrainingItemResponse, Error, number>({
    mutationFn: completeTrainingItem,
    onSuccess: (result) => {
      queryClient.setQueryData<TrainingCenterResponse>(
        TRAINING_CENTER_QUERY_KEY,
        (previous) =>
          previous ? { ...previous, progress: result.progress } : previous
      );
    },
  });
}
