import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, LoadingState, type UserAutocompleteOption } from '@shared/components';
import { useToastStore } from '@/store';
import { bpmService } from '../services/bpm-service';
import { MultiUserSelect, type SelectedUser } from './multi-user-select';
import type { UserRef } from '../types';

/**
 * The BPM managers picker in BPM Settings.
 *
 * Search is the company-wide inviter search rather than the default user
 * search, which is scoped to the caller's own team: a BPM manager can be
 * anybody. Edits are held until Save, because removing somebody is a real
 * revocation and should not happen on a stray click of a chip's ×.
 *
 * Saving invalidates the sidebar's cached capabilities, so if the viewer
 * removed themselves the BPM Settings link goes without waiting out the cache.
 */

const toSelected = (rows: UserRef[]): SelectedUser[] =>
  rows.map((row) => ({ id: row.id, label: row.name || `User #${row.id}` }));

const sameIds = (a: SelectedUser[], b: SelectedUser[]) => {
  const left = a.map((user) => user.id).sort((x, y) => x - y);
  const right = b.map((user) => user.id).sort((x, y) => x - y);
  return left.length === right.length && left.every((id, index) => id === right[index]);
};

export function BpmManagersEditor() {
  const addToast = useToastStore((state) => state.addToast);
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState<SelectedUser[]>([]);
  const [selected, setSelected] = useState<SelectedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    bpmService
      .bpmManagers()
      .then((rows) => {
        if (cancelled) return;
        const next = toSelected(rows);
        setSaved(next);
        setSelected(next);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const searchPeople = useCallback(async (search: string): Promise<UserAutocompleteOption[]> => {
    const rows = await bpmService.searchInviters(search);
    return rows.map((row) => ({
      id: row.id,
      label: row.name,
      agencyCode: row.agency_code || '',
      meta: [row.agency_code, row.phone].filter(Boolean).join(' | '),
    }));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const next = toSelected(await bpmService.setBpmManagers(selected.map((user) => user.id)));
      setSaved(next);
      setSelected(next);
      void queryClient.invalidateQueries({ queryKey: ['bpm', 'capabilities'] });
      addToast({ type: 'success', message: 'BPM managers saved.' });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save BPM managers',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;
  if (loadFailed) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
        BPM managers could not be loaded.
      </p>
    );
  }

  const dirty = !sameIds(saved, selected);

  return (
    <div className="grid gap-3">
      <MultiUserSelect
        selected={selected}
        onChange={setSelected}
        placeholder="Search by name or agency code"
        fetchOptions={searchPeople}
        disabled={saving}
      />
      {selected.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-white/60">
          No BPM managers yet — only Admin can manage BPMs.
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        {dirty ? (
          <Button variant="secondary" disabled={saving} onClick={() => setSelected(saved)}>
            Discard
          </Button>
        ) : null}
        <Button disabled={saving || !dirty} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save managers'}
        </Button>
      </div>
    </div>
  );
}
