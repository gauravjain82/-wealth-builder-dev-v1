import { useCallback, useEffect, useMemo, useState } from 'react';
import { sessionService } from '../services/session-service';
import type { PaginatedResponse } from '../types/event';
import type {
  SessionAttendee,
  SessionCheckinPayload,
  SessionDoorFilters,
  SessionScanResult,
  SessionStats,
} from '../types/session';

const EMPTY_STATS: SessionStats = {
  expected: 0,
  arrived: 0,
  remaining: 0,
  self_scanned: 0,
  overrides: 0,
};

// Self-scans arrive without anyone touching this screen; poll the counters so
// the door's numbers keep up with attendees scanning the room code.
const STATS_POLL_MS = 15000;

/**
 * Door state for one session: its paginated attendee list, counters, and the
 * check-in / undo mutations. Rows are patched in place after a mutation so the
 * table doesn't flash between scans; the counters are re-fetched.
 */
export function useSessionDoor(eventId: number, sessionId: number | null) {
  const [page, setPage] = useState<PaginatedResponse<SessionAttendee> | null>(null);
  const [stats, setStats] = useState<SessionStats>(EMPTY_STATS);
  const [filters, setFiltersState] = useState<SessionDoorFilters>({ page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // A new session starts on a fresh, unfiltered first page.
  useEffect(() => {
    setFiltersState({ page: 1 });
    setPage(null);
    setStats(EMPTY_STATS);
  }, [sessionId]);

  const loadList = useCallback(async () => {
    if (sessionId == null) return;
    setLoading(true);
    setError(null);
    try {
      setPage(await sessionService.door(eventId, sessionId, filters));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load attendees.');
    } finally {
      setLoading(false);
    }
  }, [eventId, sessionId, filters]);

  const loadStats = useCallback(async () => {
    if (sessionId == null) return;
    try {
      setStats(await sessionService.stats(eventId, sessionId));
    } catch {
      // Counters are supplementary — a failure must not blank the list.
    }
  }, [eventId, sessionId]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadStats();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadStats();
    }, STATS_POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadStats]);

  const setFilters = useCallback((next: Partial<SessionDoorFilters>) => {
    setFiltersState((current) => ({ ...current, ...next, page: next.page ?? 1 }));
  }, []);

  /** Patch the row in place, or reload when the arrival filter no longer matches it. */
  const syncRow = useCallback(
    (row: SessionAttendee) => {
      const inList = page?.results.some((r) => r.id === row.id);
      if ((filters.arrived !== undefined && filters.arrived !== row.checked_in) || !inList) {
        void loadList();
      } else {
        setPage((current) =>
          current
            ? { ...current, results: current.results.map((r) => (r.id === row.id ? { ...r, ...row } : r)) }
            : current,
        );
      }
      void loadStats();
    },
    [filters.arrived, loadList, loadStats, page],
  );

  const checkIn = useCallback(
    async (payload: SessionCheckinPayload): Promise<SessionScanResult> => {
      if (sessionId == null) throw new Error('Pick a session first.');
      const row = await sessionService.checkIn(eventId, sessionId, payload);
      syncRow(row);
      return row;
    },
    [eventId, sessionId, syncRow],
  );

  const undo = useCallback(
    async (ticketId: number): Promise<SessionAttendee> => {
      if (sessionId == null) throw new Error('Pick a session first.');
      const row = await sessionService.undo(eventId, sessionId, ticketId);
      syncRow(row);
      return row;
    },
    [eventId, sessionId, syncRow],
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
    undo,
    refetch: async () => {
      await Promise.all([loadList(), loadStats()]);
    },
  };
}
