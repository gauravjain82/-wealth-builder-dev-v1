import { useEffect, useState } from 'react';
import { fetchAgencyDailySixHistory, type DailySixHistoryMonth } from '../services/builders-service';

interface DailySixHistoryState {
  data: DailySixHistoryMonth | null;
  loading: boolean;
  error: string | null;
}

/**
 * One calendar month of Daily Six submissions for the public agency-code page.
 * Changing the month aborts the request still in flight, so a slow earlier
 * month cannot land on top of the one now showing. Bump `reloadKey` to refetch
 * after a save.
 */
export function useDailySixHistory(agencyCode: string, month: string, reloadKey = 0): DailySixHistoryState {
  const [state, setState] = useState<DailySixHistoryState>({ data: null, loading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetchAgencyDailySixHistory(agencyCode, month, controller.signal)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Unable to load your Daily Six history.',
        });
      });

    return () => controller.abort();
  }, [agencyCode, month, reloadKey]);

  return state;
}
