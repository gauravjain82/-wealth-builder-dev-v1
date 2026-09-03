import type {
  CheckinAttendee,
  CheckinExportType,
  CheckinFilters,
  CheckinPayload,
  CheckinScanResult,
  CheckinStats,
} from '../types/checkin';
import type { PaginatedResponse } from '../types/event';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Check-in is nested on the events resource — note the double `events/`.
const EVENTS_BASE = '/api/events/events';

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
    headers: { ...authHeaders(init?.body !== undefined), ...init?.headers },
  });
  if (!response.ok) throw new Error(await parseError(response));
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function buildQuery(
  params: Record<string, string | number | boolean | undefined | null> | object,
): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  return entries.length
    ? '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()
    : '';
}

async function fetchBlob(path: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: authHeaders(false) });
  if (!response.ok) throw new Error(await parseError(response));
  return response.blob();
}

export const checkinService = {
  listAttendees(
    eventId: number,
    filters: CheckinFilters = {},
  ): Promise<PaginatedResponse<CheckinAttendee>> {
    return request(`${EVENTS_BASE}/${eventId}/checkin/${buildQuery(filters)}`);
  },

  arrivedList(
    eventId: number,
    filters: Omit<CheckinFilters, 'arrived'> = {},
  ): Promise<PaginatedResponse<CheckinAttendee>> {
    return request(`${EVENTS_BASE}/${eventId}/checkin/arrived/${buildQuery(filters)}`);
  },

  stats(eventId: number): Promise<CheckinStats> {
    return request(`${EVENTS_BASE}/${eventId}/checkin/stats/`);
  },

  /** Mark a holder arrived. Returns the updated row plus a duplicate flag. */
  checkIn(eventId: number, payload: CheckinPayload): Promise<CheckinScanResult> {
    return request(`${EVENTS_BASE}/${eventId}/checkin/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** Reverse an accidental scan. Returns the updated attendee row. */
  undoCheckIn(eventId: number, ticketId: number): Promise<CheckinAttendee> {
    return request(`${EVENTS_BASE}/${eventId}/checkin/undo/`, {
      method: 'POST',
      body: JSON.stringify({ ticket_id: ticketId }),
    });
  },

  /**
   * Download the roster honouring the current filters. The variant is passed
   * as `type` — `format` is reserved by DRF for content negotiation.
   */
  async exportRoster(
    eventId: number,
    shortcut: string,
    type: CheckinExportType = 'xlsx',
    filters: CheckinFilters = {},
  ): Promise<void> {
    const blob = await fetchBlob(
      `${EVENTS_BASE}/${eventId}/checkin/export/${buildQuery({ ...filters, type })}`,
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${shortcut}-checkin.${type}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },

  /** Open the PDF roster in a new tab so the browser print dialog can be used. */
  async printRoster(eventId: number, filters: CheckinFilters = {}): Promise<void> {
    const blob = await fetchBlob(
      `${EVENTS_BASE}/${eventId}/checkin/export/${buildQuery({ ...filters, type: 'pdf' })}`,
    );
    window.open(URL.createObjectURL(blob), '_blank', 'noopener');
  },
};
