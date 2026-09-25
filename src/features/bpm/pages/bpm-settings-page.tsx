import { useCallback, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button, LoadingState } from '@shared/components';
import { useToastStore } from '@/store';
import { BPMCard, BPMPageShell } from '../components/bpm-page-shell';
import { BpmSettingsToggles } from '../components/bpm-settings-toggles';
import { RowColorRulesEditor } from '../components/row-color-rules-editor';
import { useBpmConfig } from '../context/bpm-config-context';
import { bpmService } from '../services/bpm-service';
import type { BPMCapabilities, BPMEventListItem, BPMSettings } from '../types';

/**
 * BPM General Settings.
 *
 * Three sections, added in two phases. Phase 2 shipped **deleted-item
 * recovery**, which is what makes the DELETED status safe to use at all —
 * without somewhere to un-delete, a delete would be irreversible. Phase 7 added
 * the **feature switches** and the **row-colour schemes**.
 *
 * Both Phase 7 sections write through the shared BPM config provider rather
 * than holding their own copy, so an edit here immediately recolours the guest
 * lists and re-gates the download controls without a reload.
 *
 * **If this page says "no access" to everybody, including admins**, that is not
 * a bug: `bpm_settings:manage` is granted to nobody by default, per the
 * standing rule that grants are made in the access console rather than in a
 * migration. Grant it there.
 */
export default function BpmSettingsPage() {
  const addToast = useToastStore((state) => state.addToast);
  const { settings, rules, loading: configLoading, refresh } = useBpmConfig();
  const [capabilities, setCapabilities] = useState<BPMCapabilities | null>(null);
  const [deleted, setDeleted] = useState<BPMEventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  // The toggles answer from the server on every save, so the page shows the
  // saved state rather than an optimistic one; the provider is refreshed
  // alongside it so the rest of BPM sees the change without a reload.
  const [localSettings, setLocalSettings] = useState<BPMSettings | null>(null);

  useEffect(() => {
    bpmService.capabilities().then(setCapabilities).catch(() => setCapabilities(null));
  }, []);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDeleted(await bpmService.deletedEvents());
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to load deleted BPMs',
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (capabilities?.can_manage_settings) void load();
    else setLoading(false);
  }, [capabilities, load]);

  const undelete = async (event: BPMEventListItem) => {
    setBusyId(event.id);
    try {
      await bpmService.undeleteEvent(event.id);
      setDeleted((prev) => prev.filter((row) => row.id !== event.id));
      addToast({ type: 'success', message: `${event.name} restored.` });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Restore failed',
      });
    } finally {
      setBusyId(null);
    }
  };

  const onSettingsSaved = (saved: BPMSettings) => {
    setLocalSettings(saved);
    // Every other BPM screen reads these through the provider.
    void refresh();
  };

  if (capabilities && !capabilities.can_manage_settings) {
    return (
      <BPMPageShell title="BPM Settings">
        <BPMCard>
          <p className="py-6 text-center text-sm text-slate-500 dark:text-white/60">
            You do not have access to BPM settings.
          </p>
        </BPMCard>
      </BPMPageShell>
    );
  }

  return (
    <BPMPageShell
      title="BPM Settings"
      description="Recover deleted BPMs and control how the BPM tools behave."
    >
      <BPMCard className="mb-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">
          Feature controls
        </h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-white/60">
          Each switch saves as you change it. They apply platform-wide.
        </p>
        {localSettings ? (
          <BpmSettingsToggles settings={localSettings} onSaved={onSettingsSaved} />
        ) : configLoading ? (
          <LoadingState />
        ) : (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
            Settings could not be loaded.
          </p>
        )}
      </BPMCard>

      <BPMCard className="mb-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">
          Row colour schemes
        </h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-white/60">
          How lists signal that a person has moved to another list or flow. Fill and outline
          are independent, so a row can carry one of each — a confirmed guest who booked an
          appointment shows both. When two rules of the same kind fire, the lower priority
          wins.
        </p>
        {configLoading && rules.length === 0 ? (
          <LoadingState />
        ) : (
          <RowColorRulesEditor rules={rules} onChanged={refresh} />
        )}
      </BPMCard>

      <BPMCard>
        <h2 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">
          Deleted BPMs
        </h2>
        <p className="mb-3 text-xs text-slate-500 dark:text-white/60">
          A deleted BPM is hidden everywhere and cannot be edited until it is restored.
          Nothing is destroyed — its dates, guests and check-ins are all still here.
        </p>

        {loading ? (
          <LoadingState />
        ) : deleted.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
            No deleted BPMs.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/10">
            {deleted.map((event) => (
              <li key={event.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {event.name}
                  </div>
                  <div className="truncate text-xs text-slate-500 dark:text-white/60">
                    {event.occurrence_count} date{event.occurrence_count === 1 ? '' : 's'}
                    {event.created_by_name ? ` · created by ${event.created_by_name}` : ''}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyId === event.id}
                  onClick={() => void undelete(event)}
                >
                  <RotateCcw size={14} /> {busyId === event.id ? 'Restoring…' : 'Restore'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </BPMCard>
    </BPMPageShell>
  );
}
