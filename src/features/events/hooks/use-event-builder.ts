import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BigEvent, BigEventPayload } from '../types/event';
import { eventService } from '../services/event-service';
import { PUBLISH_REQUIRED_FIELDS, TAB_REGISTRY } from '../components/builder/tab-registry';

/**
 * Loads a single event for the builder and exposes a tab-scoped save.
 *
 * Each tab PATCHes only its own fields via `saveTab`; the returned event is the
 * server's fresh copy, so downstream tabs and the publish banner stay in sync.
 * `missingRequiredFields` drives the "fields remaining" banner and mirrors the
 * backend's publish validation.
 */
export function useEventBuilder(eventId: number) {
  const [event, setEvent] = useState<BigEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // `?tab=<id>` deep-links a builder tab (e.g. the session door's "Open the agenda").
  const [activeTab, setActiveTab] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('tab');
    return TAB_REGISTRY.some((tab) => tab.id === requested) ? (requested as string) : 'event';
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    eventService
      .get(eventId)
      .then((data) => {
        if (!cancelled) setEvent(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load event');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const saveTab = useCallback(
    async (data: Partial<BigEventPayload>): Promise<void> => {
      setSaving(true);
      try {
        const updated = await eventService.partialUpdate(eventId, data);
        setEvent(updated);
      } finally {
        setSaving(false);
      }
    },
    [eventId],
  );

  /** Publish or unpublish, replacing the event with the server's copy. */
  const changeStatus = useCallback(
    async (action: 'publish' | 'unpublish'): Promise<void> => {
      setSaving(true);
      try {
        setEvent(await eventService[action](eventId));
      } finally {
        setSaving(false);
      }
    },
    [eventId],
  );

  const missingRequiredFields = useMemo(() => {
    if (!event) return [];
    return PUBLISH_REQUIRED_FIELDS.filter((field) => {
      const value = event[field];
      return value === null || value === undefined || value === '';
    });
  }, [event]);

  return {
    event,
    loading,
    error,
    saving,
    activeTab,
    setActiveTab,
    saveTab,
    changeStatus,
    missingRequiredFields,
  };
}
