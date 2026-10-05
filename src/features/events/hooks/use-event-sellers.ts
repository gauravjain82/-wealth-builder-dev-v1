import { useEffect, useState } from 'react';
import { configService } from '../services/config-service';
import type { EventTrackedSeller } from '../types/config';

/** Load an event's active sellers; an empty list means there is nothing to ask. */
export function useEventSellers(eventId: number | undefined, enabled: boolean) {
  const [sellers, setSellers] = useState<EventTrackedSeller[]>([]);

  useEffect(() => {
    if (!enabled || !eventId) return;
    let cancelled = false;
    configService
      .listSellers(eventId)
      .then((rows) => !cancelled && setSellers(rows))
      .catch(() => !cancelled && setSellers([]));
    return () => {
      cancelled = true;
    };
  }, [eventId, enabled]);

  return sellers;
}
