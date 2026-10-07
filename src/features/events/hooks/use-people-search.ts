import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orderService } from '../services/order-service';

/**
 * The transfer modals' person search. The settled query text is part of the key,
 * and react-query's `signal` cancels the superseded request, so a slow earlier
 * search can never replace the results of the current one.
 */
export function usePeopleSearch(eventId: number | undefined, text: string, enabled: boolean) {
  const [q, setQ] = useState(text.trim());
  useEffect(() => {
    const timer = window.setTimeout(() => setQ(text.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [text]);

  return useQuery({
    queryKey: ['events', eventId, 'people-search', q],
    queryFn: ({ signal }) => orderService.searchPeople(eventId as number, q, signal),
    enabled: enabled && Boolean(eventId) && q.length >= 2,
    staleTime: 30_000,
  });
}
