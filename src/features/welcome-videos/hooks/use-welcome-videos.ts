/**
 * React Query hook for the welcome-video library.
 *
 * The list is a fixed catalogue that changes only with a backend deploy, so it is
 * cached for the session rather than refetched on focus.
 */

import { useQuery } from '@tanstack/react-query';

import { fetchWelcomeVideos } from '../services/welcome-videos-service';

const KEY = 'welcome-videos';

export function useWelcomeVideos() {
  return useQuery({
    queryKey: [KEY, 'list'],
    queryFn: ({ signal }) => fetchWelcomeVideos(signal),
    select: (data) => [...data.results].sort((a, b) => a.sequence - b.sequence),
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
