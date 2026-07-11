import type {
  AppointmentDetail,
  AppointmentFilters,
  AppointmentListItem,
  AppointmentType,
  CalendarAppointment,
  CompleteAppointmentPayload,
  CreateAppointmentPayload,
  GoogleStatus,
  MatchupActionRequiredResponse,
  MatchupMetrics,
  MatchupStatusMeta,
  PaginatedResponse,
  TrainerCandidate,
  UpdateAppointmentPayload,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function authHeaders(isJson = true): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Token ${token}`,
    ...(isJson ? { 'Content-Type': 'application/json' } : {}),
  };
}

async function parseError(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status})`;
  const data = (await response.json().catch(() => null)) as unknown;
  if (!data || typeof data !== 'object') return fallback;
  if ('detail' in data) {
    const detail = (data as { detail?: unknown }).detail;
    if (Array.isArray(detail)) return detail.join(', ');
    if (typeof detail === 'string') return detail;
  }
  const firstFieldError = Object.entries(data as Record<string, unknown>).find(([, value]) => {
    return Array.isArray(value) || typeof value === 'string';
  });
  if (!firstFieldError) return fallback;
  const [field, value] = firstFieldError;
  return Array.isArray(value) ? `${field}: ${value.join(', ')}` : `${field}: ${value}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...authHeaders(init?.body !== undefined),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function buildQuery(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

function listQuery(filters: AppointmentFilters = {}) {
  return buildQuery({
    preset: filters.preset && filters.preset !== 'all' ? filters.preset : undefined,
    status: filters.status,
    kind: filters.kind,
    types: filters.types,
    search: filters.search,
    page: filters.page,
    page_size: filters.pageSize,
    start_after: filters.start_after,
    start_before: filters.start_before,
  });
}

export function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function localDateTimeValue(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
}

export function formatAppointmentTime(value: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...options,
  }).format(new Date(value));
}

export const matchupService = {
  statuses: () =>
    request<{ statuses: MatchupStatusMeta[]; presets: string[] }>('/api/matchup/appointments/statuses/'),

  appointmentTypes: () => request<AppointmentType[]>('/api/matchup/appointment-types/'),

  appointments: (filters: AppointmentFilters = {}) =>
    request<PaginatedResponse<AppointmentListItem>>(`/api/matchup/appointments/${listQuery(filters)}`),

  appointment: (id: number) => request<AppointmentDetail>(`/api/matchup/appointments/${id}/`),

  createAppointment: (payload: CreateAppointmentPayload) =>
    request<AppointmentDetail>('/api/matchup/appointments/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAppointment: (id: number, payload: UpdateAppointmentPayload) =>
    request<AppointmentDetail>(`/api/matchup/appointments/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteAppointment: (id: number) =>
    request<void>(`/api/matchup/appointments/${id}/`, {
      method: 'DELETE',
    }),

  calendar: (start: string, end: string) =>
    request<CalendarAppointment[]>(
      `/api/matchup/appointments/calendar/${buildQuery({ start, end })}`,
    ),

  metrics: (filters: AppointmentFilters = {}) =>
    request<MatchupMetrics>(`/api/matchup/appointments/metrics/${listQuery(filters)}`),

  actionRequired: () => request<MatchupActionRequiredResponse>('/api/matchup/appointments/action-required/'),

  assign: (appointmentId: number, trainerId: number) =>
    request<AppointmentDetail>(`/api/matchup/appointments/${appointmentId}/assign/`, {
      method: 'POST',
      body: JSON.stringify({ trainer_id: trainerId }),
    }),

  accept: (appointmentId: number) =>
    request<AppointmentDetail>(`/api/matchup/appointments/${appointmentId}/accept/`, { method: 'POST' }),

  decline: (appointmentId: number, reason = '') =>
    request<AppointmentDetail>(`/api/matchup/appointments/${appointmentId}/decline/`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  reschedule: (appointmentId: number, payload: { start_at: string; duration_minutes: number; timezone: string; reason?: string }) =>
    request<AppointmentDetail>(`/api/matchup/appointments/${appointmentId}/reschedule/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  complete: (appointmentId: number, payload: CompleteAppointmentPayload) =>
    request<AppointmentDetail>(`/api/matchup/appointments/${appointmentId}/complete/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  notInterested: (appointmentId: number) =>
    request<AppointmentDetail>(`/api/matchup/appointments/${appointmentId}/not-interested/`, { method: 'POST' }),

  cancel: (appointmentId: number) =>
    request<AppointmentDetail>(`/api/matchup/appointments/${appointmentId}/cancel/`, { method: 'POST' }),

  trainerSearch: (params: { q?: string; baseOnly?: boolean; start?: string; end?: string }) =>
    request<TrainerCandidate[]>(
      `/api/matchup/trainer-search/${buildQuery({
        q: params.q,
        base_only: params.baseOnly ? '1' : undefined,
        start: params.start,
        end: params.end,
      })}`,
    ),

  exportUrl: (filters: AppointmentFilters = {}) =>
    `${API_BASE_URL}/api/matchup/appointments/export/${listQuery(filters)}`,

  googleStatus: () => request<GoogleStatus>('/api/matchup/google/status/'),

  startGoogleOAuth: () => request<{ authorization_url: string }>('/api/matchup/google/oauth/start/'),

  disconnectGoogle: () =>
    request<GoogleStatus>('/api/matchup/google/status/', {
      method: 'DELETE',
    }),

  downloadExport: async (filters: AppointmentFilters = {}) => {
    const response = await fetch(matchupService.exportUrl(filters), { headers: authHeaders(false) });
    if (!response.ok) throw new Error(await parseError(response));
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `matchup-appointments-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
