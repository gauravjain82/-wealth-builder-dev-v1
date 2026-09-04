/**
 * TanStack Query hooks for the Calendar Sync feature.
 *
 * Queries read status / settings / calendars; mutations toggle per-source sync
 * flags, set target calendars, run on-demand sync, and disconnect. Every
 * mutation invalidates the affected queries and surfaces success/error toasts.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/store';
import { calendarSyncService } from '../services/calendar-sync-service';
import type {
  CalendarSource,
  PullSummary,
  SetSourceTargetBody,
  SourceToggleUpdate,
  SyncResult,
} from '../types';

/** Render a compact human summary of a single source's sync result. */
export function summarizeSyncResult(result: SyncResult): string {
  const parts: string[] = [`pushed ${result.pushed}`];
  const pull: PullSummary = result.pull || { status: 'unknown' };
  if (pull.reflected) parts.push(`reflected ${pull.reflected}`);
  if (pull.deleted) parts.push(`deleted ${pull.deleted}`);
  if (pull.repushed) parts.push(`re-pushed ${pull.repushed}`);
  if (pull.busy_imported) parts.push(`${pull.busy_imported} busy imported`);
  if (pull.busy_removed) parts.push(`${pull.busy_removed} busy removed`);
  return parts.join(' · ');
}

/** Central query-key factory so invalidation stays consistent. */
export const calendarSyncKeys = {
  root: ['calendarSync'] as const,
  status: ['calendarSync', 'status'] as const,
  settings: ['calendarSync', 'settings'] as const,
  calendars: ['calendarSync', 'calendars'] as const,
};

/** Connection status + per-source mapping summary. */
export function useCalendarSyncStatus() {
  return useQuery({
    queryKey: calendarSyncKeys.status,
    queryFn: () => calendarSyncService.status(),
    staleTime: 30_000,
  });
}

/** Per-source mapping + toggle state. */
export function useCalendarSyncSettings() {
  return useQuery({
    queryKey: calendarSyncKeys.settings,
    queryFn: async () => (await calendarSyncService.getSettings()).sources,
    staleTime: 30_000,
  });
}

/**
 * The user's Google calendars for the picker.
 *
 * @param enabled - Only fetch when connected with the full scope; the endpoint
 *   returns 400 otherwise (old scope / not connected).
 */
export function useGoogleCalendars(enabled: boolean) {
  return useQuery({
    queryKey: calendarSyncKeys.calendars,
    queryFn: async () => (await calendarSyncService.listCalendars()).calendars,
    enabled,
    staleTime: 5 * 60_000,
  });
}

/** Update per-source sync/push/pull toggles (partial, one or many sources). */
export function useUpdateSourceToggles() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  return useMutation({
    mutationFn: (sources: SourceToggleUpdate[]) => calendarSyncService.updateSettings(sources),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: calendarSyncKeys.settings });
      void queryClient.invalidateQueries({ queryKey: calendarSyncKeys.status });
    },
    onError: (error) =>
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update sync settings.',
      }),
  });
}

/** Set a source's target calendar (existing pick or create a branded one). */
export function useSetSourceTarget() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  return useMutation({
    mutationFn: ({ source, body }: { source: CalendarSource; body: SetSourceTargetBody }) =>
      calendarSyncService.setSourceTarget(source, body),
    onSuccess: (mapping) => {
      void queryClient.invalidateQueries({ queryKey: calendarSyncKeys.settings });
      void queryClient.invalidateQueries({ queryKey: calendarSyncKeys.status });
      addToast({
        type: 'success',
        message: `${mapping.label} calendar set to ${mapping.calendar_summary || 'selected calendar'}.`,
      });
    },
    onError: (error) =>
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to set target calendar.',
      }),
  });
}

/** Run on-demand push + pull for a single source. */
export function useSyncSource() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  return useMutation({
    mutationFn: (source: CalendarSource) => calendarSyncService.syncSource(source),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: calendarSyncKeys.settings });
      addToast({ type: 'success', message: `Synced ${result.source}: ${summarizeSyncResult(result)}.` });
    },
    onError: (error) =>
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Sync failed.',
      }),
  });
}

/** Run on-demand push + pull for every source. */
export function useSyncAll() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  return useMutation({
    mutationFn: () => calendarSyncService.syncAll(),
    onSuccess: ({ results }) => {
      void queryClient.invalidateQueries({ queryKey: calendarSyncKeys.settings });
      const pushed = results.reduce((sum, r) => sum + (r.pushed || 0), 0);
      addToast({ type: 'success', message: `Synced ${results.length} sources · pushed ${pushed} total.` });
    },
    onError: (error) =>
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Sync failed.',
      }),
  });
}

/** Disconnect the Google account (soft). */
export function useDisconnectGoogle() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  return useMutation({
    mutationFn: () => calendarSyncService.disconnect(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: calendarSyncKeys.root });
      addToast({ type: 'success', message: 'Google Calendar disconnected.' });
    },
    onError: (error) =>
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to disconnect Google Calendar.',
      }),
  });
}
