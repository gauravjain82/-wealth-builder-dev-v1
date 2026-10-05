import { useQuery } from '@tanstack/react-query';
import { eventService } from '../services/event-service';

export const EVENTS_ACCESS_QUERY_KEY = ['events', 'my-access'] as const;

/**
 * Which Big Event screens the viewer can open. Drives the sidebar group, the event
 * pickers and the in-event navigation; the backend still checks every request.
 */
export function useEventsAccess() {
  return useQuery({
    queryKey: EVENTS_ACCESS_QUERY_KEY,
    queryFn: ({ signal }) => eventService.myAccess(signal),
    staleTime: 5 * 60 * 1000,
  });
}
