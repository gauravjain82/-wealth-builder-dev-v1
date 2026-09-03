import { useCallback, useEffect, useMemo, useState } from 'react';
import { checkinService } from '../services/checkin-service';
import type {
  CheckinAttendee,
  CheckinFilters,
  CheckinPayload,
  CheckinScanResult,
  CheckinStats,
} from '../types/checkin';
import type { PaginatedResponse } from '../types/event';

const EMPTY_STATS: CheckinStats = {
  expected: 0,
  arrived: 0,
  remaining: 0,
  assigned: 0,
  unassigned: 0,
};

/**
 * Door-list state for one event: paginated attendees, arrival counters, and
 * the mutations staff perform at the entrance.
 *
 * Attendee rows are patched in place after a check-in or undo so the table
 * doesn't flash between scans; only the counters are re-fetched.
 */
export function useCheckIn(eventId: number) {
  const [page, setPage] = useState<PaginatedResponse<CheckinAttendee> | null>(null);
  const [stats, setStats] = useState<CheckinStats>(EMPTY_STATS);
  const [filters, setFiltersState] = useState<CheckinFilters>({ page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const enabled = Number.isFinite(eventId);

  const loadAttendees = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      setPage(await checkinService.listAttendees(eventId, filters));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendees');
    } finally {
      setLoading(false);
    }
  }, [enabled, eventId, filters]);

  const loadStats = useCallback(async () => {
    if (!enabled) return;
    try {
      setStats(await checkinService.stats(eventId));
    } catch {
      // Counters are supplementary — a failure here must not blank the list.
    }
  }, [enabled, eventId]);

  useEffect(() => {
    void loadAttendees();
  }, [loadAttendees]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  /** Merge filter changes, resetting to page 1 unless the page itself moved. */
  const setFilters = useCallback((next: Partial<CheckinFilters>) => {
    setFiltersState((current) => ({
      ...current,
      ...next,
      page: next.page ?? 1,
    }));
  }, []);

  const patchRow = useCallback((row: CheckinAttendee) => {
    setPage((current) =>
      current
        ? { ...current, results: current.results.map((r) => (r.id === row.id ? row : r)) }
        : current,
    );
  }, []);

  const refetch = useCallback(async () => {
    await Promise.all([loadAttendees(), loadStats()]);
  }, [loadAttendees, loadStats]);

  /**
   * Reflect a mutated row: patch it in place, or reload the list when the
   * active arrival filter no longer matches it (so the row leaves the view).
   */
  const syncRow = useCallback(
    (row: CheckinAttendee) => {
      if (filters.arrived !== undefined && filters.arrived !== row.checked_in) {
        void loadAttendees();
      } else {
        patchRow(row);
      }
      void loadStats();
    },
    [filters.arrived, loadAttendees, loadStats, patchRow],
  );

  const checkIn = useCallback(
    async (payload: CheckinPayload): Promise<CheckinScanResult> => {
      const row = await checkinService.checkIn(eventId, payload);
      syncRow(row);
      return row;
    },
    [eventId, syncRow],
  );

  const undoCheckIn = useCallback(
    async (ticketId: number): Promise<CheckinAttendee> => {
      const row = await checkinService.undoCheckIn(eventId, ticketId);
      syncRow(row);
      return row;
    },
    [eventId, syncRow],
  );

  const attendees = useMemo(() => page?.results ?? [], [page]);

  return {
    attendees,
    count: page?.count ?? 0,
    stats,
    filters,
    setFilters,
    loading,
    error,
    checkIn,
    undoCheckIn,
    refetch,
  };
}
