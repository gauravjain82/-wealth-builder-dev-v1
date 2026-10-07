import { useCallback, useEffect, useState } from 'react';
import type { EventTicket, HeldTicket, MyTicketsResponse, OwnerSummary } from '../types/ticket';
import { orderService } from '../services/order-service';

const EMPTY_SUMMARY: OwnerSummary = {
  total_owned: 0,
  assigned: 0,
  unassigned: 0,
  transferred: 0,
  checked_in: 0,
};

const NO_HELD: HeldTicket[] = [];

/**
 * Loads the current user's owned tickets for an event (bulk-buy dashboard),
 * plus the tickets they are the named attendee of (`heldTickets`).
 */
export function useMyTickets(eventId: number) {
  const [data, setData] = useState<MyTicketsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await orderService.getMyTickets(eventId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    tickets: (data?.tickets ?? []) as EventTicket[],
    heldTickets: data?.held_tickets ?? NO_HELD,
    summary: data?.summary ?? EMPTY_SUMMARY,
    loading,
    error,
    refetch,
  };
}
