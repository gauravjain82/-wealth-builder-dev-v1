import { useCallback, useEffect, useState } from 'react';

/**
 * CRUD API surface a config resource must expose to be managed by
 * {@link useConfigList} and the generic collection editor. Mirrors the shape of
 * each `configService.*` resource group (list/create/update/delete).
 */
export interface ConfigListApi<T> {
  list: (eventId: number) => Promise<T[]>;
  create: (eventId: number, payload: Partial<T>) => Promise<T>;
  update: (eventId: number, itemId: number, payload: Partial<T>) => Promise<T>;
  remove: (eventId: number, itemId: number) => Promise<void>;
}

/**
 * State + mutations for a per-event config collection (pricing tiers, speakers,
 * add-ons, …). Loads the list on mount and re-fetches after every mutation so
 * server-computed fields (e.g. soft-delete filtering, `sold`) stay accurate.
 */
export function useConfigList<T extends { id: number }>(
  eventId: number,
  api: ConfigListApi<T>,
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setItems(await api.list(eventId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [api, eventId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(
    async (payload: Partial<T>): Promise<void> => {
      setBusy(true);
      try {
        await api.create(eventId, payload);
        await reload();
      } finally {
        setBusy(false);
      }
    },
    [api, eventId, reload],
  );

  const update = useCallback(
    async (itemId: number, payload: Partial<T>): Promise<void> => {
      setBusy(true);
      try {
        await api.update(eventId, itemId, payload);
        await reload();
      } finally {
        setBusy(false);
      }
    },
    [api, eventId, reload],
  );

  const remove = useCallback(
    async (itemId: number): Promise<void> => {
      setBusy(true);
      try {
        await api.remove(eventId, itemId);
        await reload();
      } finally {
        setBusy(false);
      }
    },
    [api, eventId, reload],
  );

  return { items, loading, error, busy, reload, create, update, remove };
}
