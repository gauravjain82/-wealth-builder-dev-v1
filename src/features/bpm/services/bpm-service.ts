import type {
  AddGuestPayload,
  AssociateCheckIn,
  BPMEmailTemplate,
  BPMEventDetail,
  BPMEventListItem,
  BPMEventPayload,
  BPMGuest,
  BPMCapabilities,
  BPMOccurrence,
  EventFilters,
  GoogleStatus,
  GuestOutcomeField,
  OccurrenceFilters,
  Office,
  OfficePayload,
  PaginatedResponse,
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

function buildQuery(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
}

export function supportedTimezones(): string[] {
  const intl = Intl as typeof Intl & {
    supportedValuesOf?: (key: 'timeZone') => string[];
  };
  try {
    return intl.supportedValuesOf?.('timeZone') ?? [];
  } catch {
    return [];
  }
}

export function formatOccurrenceTime(value: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...options,
  }).format(new Date(value));
}

export const DAY_OF_WEEK_OPTIONS = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
];

export const GUEST_OUTCOME_FIELDS: { field: GuestOutcomeField; label: string }[] = [
  { field: 'called', label: 'Called' },
  { field: 'left_message', label: 'Left Message' },
  { field: 'not_interested', label: 'Not Interested' },
  { field: 'reschedule', label: 'Reschedule' },
];

export const bpmService = {
  // -- offices -------------------------------------------------------------
  offices: (search = '') =>
    request<PaginatedResponse<Office>>(`/api/bpm/offices/${buildQuery({ search, page_size: 100 })}`),
  createOffice: (payload: OfficePayload) =>
    request<Office>('/api/bpm/offices/', { method: 'POST', body: JSON.stringify(payload) }),

  // -- email templates -----------------------------------------------------
  emailTemplates: () =>
    request<PaginatedResponse<BPMEmailTemplate>>('/api/bpm/email-templates/'),

  // -- events --------------------------------------------------------------
  events: (filters: EventFilters = {}) =>
    request<PaginatedResponse<BPMEventListItem>>(
      `/api/bpm/events/${buildQuery({
        event_type: filters.event_type,
        bpm_format: filters.bpm_format,
        is_active: filters.is_active,
        search: filters.search,
        city: filters.city,
        state: filters.state,
        segment: filters.segment,
        ordering: filters.ordering,
        page: filters.page,
        page_size: filters.page_size,
      })}`,
    ),
  // Current user's BPM action permissions, for gating UI controls.
  capabilities: () => request<BPMCapabilities>('/api/bpm/events/capabilities/'),
  event: (id: number) => request<BPMEventDetail>(`/api/bpm/events/${id}/`),
  createEvent: (payload: BPMEventPayload) =>
    request<BPMEventDetail>('/api/bpm/events/', { method: 'POST', body: JSON.stringify(payload) }),
  updateEvent: (id: number, payload: Partial<BPMEventPayload>) =>
    request<BPMEventDetail>(`/api/bpm/events/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteEvent: (id: number) =>
    request<void>(`/api/bpm/events/${id}/`, { method: 'DELETE' }),
  eventOccurrences: (id: number) =>
    request<BPMOccurrence[]>(`/api/bpm/events/${id}/occurrences/`),

  // -- occurrences ---------------------------------------------------------
  occurrences: (filters: OccurrenceFilters = {}) =>
    request<PaginatedResponse<BPMOccurrence>>(
      `/api/bpm/occurrences/${buildQuery({
        event: filters.event,
        status: filters.status,
        date: filters.date,
        start_after: filters.start_after,
        start_before: filters.start_before,
        city: filters.city,
        state: filters.state,
        bpm_format: filters.bpm_format,
        segment: filters.segment,
        page: filters.page,
        page_size: filters.page_size,
      })}`,
    ),
  occurrence: (id: number) => request<BPMOccurrence>(`/api/bpm/occurrences/${id}/`),

  guests: (occurrenceId: number) =>
    request<BPMGuest[]>(`/api/bpm/occurrences/${occurrenceId}/guests/`),
  addGuest: (occurrenceId: number, payload: AddGuestPayload) =>
    request<BPMGuest>(`/api/bpm/occurrences/${occurrenceId}/add-guest/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  removeGuest: (occurrenceId: number, guestId: number) =>
    request<{ removed: boolean }>(`/api/bpm/occurrences/${occurrenceId}/remove-guest/`, {
      method: 'POST',
      body: JSON.stringify({ guest_id: guestId }),
    }),
  transferGuest: (
    occurrenceId: number,
    payload: { guest_id: number; to_occurrence_id: number; reason?: string },
  ) =>
    request<BPMGuest>(`/api/bpm/occurrences/${occurrenceId}/transfer-guest/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  setGuestFlags: (
    occurrenceId: number,
    payload: { guest_id: number } & Partial<Record<GuestOutcomeField, boolean>>,
  ) =>
    request<BPMGuest>(`/api/bpm/occurrences/${occurrenceId}/set-guest-flags/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  addGuestNote: (occurrenceId: number, payload: { guest_id: number; text: string }) =>
    request<BPMGuest>(`/api/bpm/occurrences/${occurrenceId}/add-guest-note/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  checkInGuest: (occurrenceId: number, guestId: number) =>
    request<BPMGuest>(`/api/bpm/occurrences/${occurrenceId}/check-in-guest/`, {
      method: 'POST',
      body: JSON.stringify({ guest_id: guestId }),
    }),
  undoCheckInGuest: (occurrenceId: number, guestId: number) =>
    request<BPMGuest>(`/api/bpm/occurrences/${occurrenceId}/undo-check-in-guest/`, {
      method: 'POST',
      body: JSON.stringify({ guest_id: guestId }),
    }),
  checkInAssociate: (occurrenceId: number, userId: number) =>
    request<AssociateCheckIn>(`/api/bpm/occurrences/${occurrenceId}/check-in-associate/`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),
  associateCheckins: (occurrenceId: number) =>
    request<AssociateCheckIn[]>(`/api/bpm/occurrences/${occurrenceId}/associate-checkins/`),
  cancelOccurrence: (occurrenceId: number) =>
    request<BPMOccurrence>(`/api/bpm/occurrences/${occurrenceId}/cancel/`, { method: 'POST' }),

  // -- google calendar -----------------------------------------------------
  // BPM reuses the Match Up OAuth credential store: one Google connection per
  // user grants both calendars (the Match Up authorization already requests the
  // calendar.app.created scope the BPM "BPM" calendar needs). So the connect /
  // status / disconnect flow points at the shared Match Up endpoints.
  googleStatus: () => request<GoogleStatus>('/api/matchup/google/status/'),
  startGoogleOAuth: () =>
    request<{ authorization_url: string }>('/api/matchup/google/oauth/start/'),
  disconnectGoogle: () =>
    request<GoogleStatus>('/api/matchup/google/status/', { method: 'DELETE' }),
};
