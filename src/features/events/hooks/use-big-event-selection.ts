import { useCallback, useEffect, useState } from 'react';
import { eventService } from '../services/event-service';
import type { BigEventScreen } from '../types/access';
import type { BigEventListItem } from '../types/event';

// Shared across the top-level Big Event surfaces (Purchases, Check-in, …) so
// that picking an event on one screen carries over to the next.
const STORAGE_KEY = 'wb.bigEvent.selectedId';

interface BigEventSelection {
  events: BigEventListItem[];
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
  loading: boolean;
  error: string | null;
}

/**
 * Load the events `screen` opens for and track which one the Big Event surfaces
 * target. A per-event delegate gets only their delegated events here.
 */
export function useBigEventSelection(screen: BigEventScreen): BigEventSelection {
  const [events, setEvents] = useState<BigEventListItem[]>([]);
  const [selectedId, setSelectedIdState] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setSelectedId = useCallback((id: number | null) => {
    setSelectedIdState(id);
    if (id === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, String(id));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    eventService
      .list({ surface: screen })
      .then((response) => {
        if (!active) return;
        const list = response.results;
        setEvents(list);
        // Restore the previous selection when it still exists, else default to
        // the first event so the surface always has data to show.
        const stored = Number(localStorage.getItem(STORAGE_KEY));
        const restored = list.find((event) => event.id === stored);
        setSelectedIdState(restored ? restored.id : list[0]?.id ?? null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load events');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [screen]);

  return { events, selectedId, setSelectedId, loading, error };
}
