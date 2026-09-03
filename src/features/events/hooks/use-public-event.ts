/**
 * Loads a published event's public landing payload by shortcut.
 *
 * One request populates the whole page (tiers, speakers, partners, add-ons,
 * custom fields, sellers, current tier, sales state), so both the landing page
 * and the checkout page use this same hook rather than fetching per section.
 */

import { useCallback, useEffect, useState } from 'react';

import { PublicApiError, publicEventService } from '../services/public-event-service';
import type { PublicEvent } from '../types/public';

interface UsePublicEventResult {
  event: PublicEvent | null;
  loading: boolean;
  /** Human-readable load failure, or `null`. */
  error: string | null;
  /** True when the shortcut matched no *published* event. */
  notFound: boolean;
  reload: () => void;
}

export function usePublicEvent(shortcut: string | undefined): UsePublicEventResult {
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!shortcut) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      setEvent(await publicEventService.getEvent(shortcut));
    } catch (err) {
      // A 404 means "no such published event" — a distinct UI state from a
      // network or server failure, which is worth offering a retry for.
      if (err instanceof PublicApiError && err.status === 404) {
        setNotFound(true);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load event.');
      }
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, [shortcut]);

  useEffect(() => {
    void load();
  }, [load]);

  return { event, loading, error, notFound, reload: () => void load() };
}
