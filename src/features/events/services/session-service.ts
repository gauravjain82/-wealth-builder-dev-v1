import type { PaginatedResponse } from '../types/event';
import type {
  EligibilityAddResult,
  EventSession,
  EventSessionPayload,
  LevelOption,
  SelfCheckinPreview,
  SelfCheckinResult,
  SessionAttendanceRow,
  SessionAttendee,
  SessionCheckinPayload,
  SessionDoorFilters,
  SessionEligibilityEntry,
  SessionQr,
  SessionScanResult,
  SessionStats,
} from '../types/session';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Sessions are nested on the events resource — note the double `events/`.
const EVENTS_BASE = '/api/events/events';

/**
 * A refused request. `code` and `overridable` come from session check-in
 * refusals, so the door can offer "Admit anyway" only where staff may.
 */
export class SessionApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null = null,
    readonly overridable = false,
  ) {
    super(message);
    this.name = 'SessionApiError';
  }
}

function authHeaders(isJson = true): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Token ${token}`,
    ...(isJson ? { 'Content-Type': 'application/json' } : {}),
  };
}

function messageFrom(data: Record<string, unknown>, fallback: string): string {
  const detail = data.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.join(', ');
  const first = Object.entries(data).find(
    ([, value]) => Array.isArray(value) || typeof value === 'string',
  );
  if (!first) return fallback;
  const [field, value] = first;
  const text = Array.isArray(value) ? value.join(', ') : String(value);
  return field === 'non_field_errors' ? text : `${field.replace(/_/g, ' ')}: ${text}`;
}

async function toError(response: Response): Promise<SessionApiError> {
  const fallback = `Request failed (${response.status})`;
  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!data || typeof data !== 'object') return new SessionApiError(fallback, response.status);
  return new SessionApiError(
    messageFrom(data, fallback),
    response.status,
    typeof data.code === 'string' ? data.code : null,
    data.overridable === true,
  );
}

/** Authenticated JSON request against the API; throws `SessionApiError`. */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(init?.body !== undefined), ...init?.headers },
  });
  if (!response.ok) throw await toError(response);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

/** Build a query string, dropping empty values. */
export function query(params: object): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  return entries.length
    ? '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()
    : '';
}

const sessionsUrl = (eventId: number) => `${EVENTS_BASE}/${eventId}/sessions/`;
const sessionUrl = (eventId: number, sessionId: number) =>
  `${sessionsUrl(eventId)}${sessionId}/`;

export const sessionService = {
  // --- agenda -------------------------------------------------------------
  list(eventId: number): Promise<EventSession[]> {
    return request(sessionsUrl(eventId));
  },

  create(eventId: number, payload: EventSessionPayload): Promise<EventSession> {
    return request(sessionsUrl(eventId), { method: 'POST', body: JSON.stringify(payload) });
  },

  update(eventId: number, sessionId: number, payload: EventSessionPayload): Promise<EventSession> {
    return request(sessionUrl(eventId, sessionId), {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  remove(eventId: number, sessionId: number): Promise<void> {
    return request(sessionUrl(eventId, sessionId), { method: 'DELETE' });
  },

  qr(eventId: number, sessionId: number): Promise<SessionQr> {
    return request(`${sessionUrl(eventId, sessionId)}qr/`);
  },

  regenerateQr(eventId: number, sessionId: number): Promise<SessionQr> {
    return request(`${sessionUrl(eventId, sessionId)}qr/regenerate/`, { method: 'POST' });
  },

  attendance(eventId: number): Promise<SessionAttendanceRow[]> {
    return request(`${sessionsUrl(eventId)}attendance/`);
  },

  /** Download the tickets × sessions attendance matrix. */
  async exportAttendance(eventId: number, shortcut: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}${sessionsUrl(eventId)}attendance/export/`, {
      headers: authHeaders(false),
    });
    if (!response.ok) throw await toError(response);
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = `${shortcut}-session-attendance.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },

  // --- the session door ---------------------------------------------------
  door(
    eventId: number,
    sessionId: number,
    filters: SessionDoorFilters = {},
  ): Promise<PaginatedResponse<SessionAttendee>> {
    return request(`${sessionUrl(eventId, sessionId)}checkin/${query(filters)}`);
  },

  stats(eventId: number, sessionId: number): Promise<SessionStats> {
    return request(`${sessionUrl(eventId, sessionId)}checkin/stats/`);
  },

  checkIn(
    eventId: number,
    sessionId: number,
    payload: SessionCheckinPayload,
  ): Promise<SessionScanResult> {
    return request(`${sessionUrl(eventId, sessionId)}checkin/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  undo(eventId: number, sessionId: number, ticketId: number): Promise<SessionAttendee> {
    return request(`${sessionUrl(eventId, sessionId)}checkin/undo/`, {
      method: 'POST',
      body: JSON.stringify({ ticket_id: ticketId }),
    });
  },

  // --- allow-lists --------------------------------------------------------
  eligibility(
    eventId: number,
    sessionId: number,
    params: { search?: string; page?: number } = {},
  ): Promise<PaginatedResponse<SessionEligibilityEntry>> {
    return request(`${sessionUrl(eventId, sessionId)}eligibility/${query(params)}`);
  },

  addEligible(
    eventId: number,
    sessionId: number,
    identifiers: string[],
  ): Promise<EligibilityAddResult> {
    return request(`${sessionUrl(eventId, sessionId)}eligibility/`, {
      method: 'POST',
      body: JSON.stringify({ identifiers }),
    });
  },

  removeEligible(
    eventId: number,
    sessionId: number,
    entryIds: number[],
  ): Promise<{ removed: number }> {
    return request(`${sessionUrl(eventId, sessionId)}eligibility/remove/`, {
      method: 'POST',
      body: JSON.stringify({ entry_ids: entryIds }),
    });
  },

  levels(): Promise<LevelOption[]> {
    return request<LevelOption[] | PaginatedResponse<LevelOption>>('/api/accounts/levels/').then(
      (data) => (Array.isArray(data) ? data : data.results),
    );
  },

  // --- attendee self-check-in --------------------------------------------
  selfPreview(token: string): Promise<SelfCheckinPreview> {
    return request(`/api/events/session-checkin/${token}/`);
  },

  selfCheckIn(token: string): Promise<SelfCheckinResult> {
    return request(`/api/events/session-checkin/${token}/`, { method: 'POST' });
  },
};
