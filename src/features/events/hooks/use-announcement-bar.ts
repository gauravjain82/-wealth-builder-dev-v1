import { useQuery } from '@tanstack/react-query';
import { eventService } from '../services/event-service';

export const ANNOUNCEMENT_BAR_QUERY_KEY = ['events', 'announcement-bar'] as const;

/**
 * The site-wide event banner. Refreshed every few minutes and on tab focus so the
 * "Day N of M" headline and the ticket button follow the event without a reload.
 */
export function useAnnouncementBar() {
  return useQuery({
    queryKey: ANNOUNCEMENT_BAR_QUERY_KEY,
    queryFn: ({ signal }) => eventService.announcementBar(signal),
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
