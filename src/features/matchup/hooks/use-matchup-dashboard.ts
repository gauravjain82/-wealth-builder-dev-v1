import { useCallback, useEffect, useState } from 'react';
import { monthRange, matchupService } from '../services/matchup-service';
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
      const [statusData, typeData, listData, metricData, calendarData, actionData, googleData] =
        await Promise.all([
          matchupService.statuses(),
          matchupService.appointmentTypes(),
          matchupService.appointments(filters),
          matchupService.metrics(filters, personal),
          matchupService.calendar(range.start, range.end, filters.segment, personal),
          matchupService.actionRequired(filters.segment),
          matchupService.googleStatus().catch(() => null),
        ]);

      setStatuses(statusData.statuses);
      setPresets(['all', ...statusData.presets.filter((preset) => preset !== 'all')]);
      setAppointmentTypes(typeData);
      setAppointments(listData);
      setMetrics(metricData);
      setCalendarItems(calendarData);
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
