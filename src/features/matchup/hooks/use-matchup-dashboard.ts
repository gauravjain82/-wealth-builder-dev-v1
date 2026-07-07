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

export function useMatchupDashboard(filters: AppointmentFilters, calendarMonth: Date) {
  const [appointments, setAppointments] = useState<PaginatedResponse<AppointmentListItem>>({
    count: 0,
    next: null,
    previous: null,
    results: [],
  });
  const [calendarItems, setCalendarItems] = useState<CalendarAppointment[]>([]);
  const [actionRequired, setActionRequired] = useState<AppointmentListItem[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [statuses, setStatuses] = useState<MatchupStatusMeta[]>([]);
  const [presets, setPresets] = useState<string[]>(['all']);
  const [metrics, setMetrics] = useState<MatchupMetrics>(EMPTY_METRICS);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [loading, setLoading] = useState(true);
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
          matchupService.metrics(filters),
          matchupService.calendar(range.start, range.end),
          matchupService.actionRequired(),
          matchupService.googleStatus().catch(() => null),
        ]);

      setStatuses(statusData.statuses);
      setPresets(['all', ...statusData.presets.filter((preset) => preset !== 'all')]);
      setAppointmentTypes(typeData);
      setAppointments(listData);
      setMetrics(metricData);
      setCalendarItems(calendarData);
      setActionRequired(actionData);
      setGoogleStatus(googleData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matchup data');
    } finally {
      setLoading(false);
    }
  }, [calendarMonth, filters]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    appointments,
    calendarItems,
    actionRequired,
    appointmentTypes,
    statuses,
    presets,
    metrics,
    googleStatus,
    loading,
    error,
    reload,
  };
}
