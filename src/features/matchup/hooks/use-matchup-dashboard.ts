import { useCallback, useEffect, useState } from 'react';
import { monthRange, matchupService } from '../services/matchup-service';
import { calendarSyncService } from '@/features/calendar-sync/services/calendar-sync-service';
import type { ImportedEvent } from '@/features/calendar-sync/types';
import type {
  AppointmentFilters,
  AppointmentListItem,
  AppointmentType,
  CalendarAppointment,
  GoogleStatus,
  MatchupMetrics,
  MatchupStatusMeta,
  PaginatedResponse,
} from '../types';

/**
 * Map an imported external Google event onto the calendar-item shape so the
 * month grid can render it alongside appointments. A negative `id` (derived from
 * the block id) keeps it numeric and guaranteed not to collide with real
 * appointment ids; `source: 'IMPORTED'` is what every consumer branches on.
 */
function importedToCalendarItem(event: ImportedEvent): CalendarAppointment {
  return {
    id: -event.block_id,
    kind: 'PERSONAL',
    status: 'ACCEPTED',
    status_color: '#7c3aed',
    start_at: event.start_at,
    end_at: event.end_at,
    timezone: 'UTC',
    location_type: 'VIRTUAL',
    contact_name: null,
    trainee_name: null,
    source: 'IMPORTED',
    block_id: event.block_id,
    title: event.title,
    calendar_summary: event.calendar_summary,
    description: event.description,
    location: event.location,
    all_day: event.all_day,
    google_event_id: event.google_event_id,
    google_calendar_id: event.google_calendar_id,
  };
}

const EMPTY_METRICS: MatchupMetrics = {
  by_status: {},
  total: 0,
  done: 0,
  rescheduled: 0,
  not_interested: 0,
  sales: 0,
  recruits: 0,
};

interface UseMatchupDashboardOptions {
  /** Personal calendar scope: only the logged-in user's own appointments. */
  personal?: boolean;
}

export function useMatchupDashboard(
  filters: AppointmentFilters,
  calendarMonth: Date,
  options: UseMatchupDashboardOptions = {},
) {
  const { personal = false } = options;
  const [appointments, setAppointments] = useState<PaginatedResponse<AppointmentListItem>>({
    count: 0,
    next: null,
    previous: null,
    results: [],
  });
  const [calendarItems, setCalendarItems] = useState<CalendarAppointment[]>([]);
  const [actionRequired, setActionRequired] = useState<AppointmentListItem[]>([]);
  const [canTakeAction, setCanTakeAction] = useState(false);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [statuses, setStatuses] = useState<MatchupStatusMeta[]>([]);
  const [presets, setPresets] = useState<string[]>(['all']);
  const [metrics, setMetrics] = useState<MatchupMetrics>(EMPTY_METRICS);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const range = monthRange(calendarMonth);
      const [statusData, typeData, listData, metricData, calendarData, actionData, googleData, importedData] =
        await Promise.all([
          matchupService.statuses(),
          matchupService.appointmentTypes(),
          matchupService.appointments(filters),
          matchupService.metrics(filters, personal),
          matchupService.calendar(range.start, range.end, filters.segment, personal),
          matchupService.actionRequired(filters.segment),
          matchupService.googleStatus().catch(() => null),
          // Imported external Google events only make sense on the personal
          // calendar; skip the call (and any error) elsewhere.
          personal
            ? calendarSyncService.importedEvents(range.start, range.end).catch(() => ({ imported: [] }))
            : Promise.resolve({ imported: [] }),
        ]);

      setStatuses(statusData.statuses);
      setPresets(['all', ...statusData.presets.filter((preset) => preset !== 'all')]);
      setAppointmentTypes(typeData);
      setAppointments(listData);
      setMetrics(metricData);
      setCalendarItems([
        ...calendarData,
        ...importedData.imported.map(importedToCalendarItem),
      ]);
      setActionRequired(
        [
          ...(actionData.assign ?? []),
          ...(actionData.accept ?? []),
          ...(actionData.complete ?? []),
        ].sort(
          (a, b) =>
            new Date(b.start_at).getTime() - new Date(a.start_at).getTime(),
        ),
      );
      setCanTakeAction(actionData.can_take_action ?? false);
      setGoogleStatus(googleData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matchup data');
    } finally {
      setLoading(false);
    }
  }, [calendarMonth, filters, personal]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !appointments.next) return;
    setLoadingMore(true);
    try {
      const pageSize = filters.pageSize || 50;
      const nextPage = Math.floor(appointments.results.length / pageSize) + 1;
      const nextData = await matchupService.appointments({ ...filters, page: nextPage });
      setAppointments((current) => ({
        ...nextData,
        results: [
          ...current.results,
          ...nextData.results.filter((item) => !current.results.some((existing) => existing.id === item.id)),
        ],
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more appointments');
    } finally {
      setLoadingMore(false);
    }
  }, [appointments.next, appointments.results.length, filters, loading, loadingMore]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    appointments,
    calendarItems,
    actionRequired,
    canTakeAction,
    appointmentTypes,
    statuses,
    presets,
    metrics,
    googleStatus,
    loading,
    loadingMore,
    error,
    reload,
    loadMore,
  };
}
