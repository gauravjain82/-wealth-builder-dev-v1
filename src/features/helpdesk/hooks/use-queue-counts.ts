/** React Query hook for the helpdesk "needs you" counters (header, sidebar, tabs). */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/hooks/use-auth';

import { fetchQueueCounts, type HelpdeskQueueCounts } from '../services/helpdesk-service';

/** Query key of the queue counters; invalidate it after any ticket action. */
export const QUEUE_COUNTS_KEY = ['helpdesk', 'queue-counts'] as const;

/** Polled every 60 s (and on window focus) while signed in. */
export function useQueueCounts() {
  const { user } = useAuth();
  const signedIn = Boolean(user) && Boolean(localStorage.getItem('wb.authToken'));
  return useQuery<HelpdeskQueueCounts>({
    queryKey: QUEUE_COUNTS_KEY,
    queryFn: fetchQueueCounts,
    enabled: signedIn,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    staleTime: 15 * 1000,
    retry: false,
  });
}

/** Returns a callback that refreshes the queue counters (after acknowledge/assign/reply/...). */
export function useInvalidateQueueCounts(): () => void {
  const queryClient = useQueryClient();
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: QUEUE_COUNTS_KEY });
  }, [queryClient]);
}
