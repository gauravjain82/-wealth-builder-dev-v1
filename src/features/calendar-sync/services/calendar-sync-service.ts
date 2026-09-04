/**
 * Typed API client for the Two-Way, Multi-Calendar Google Sync feature.
 *
 * Wraps the `/api/calendarsync/*` endpoints. The small `request`/`authHeaders`/
 * `parseError` helpers mirror those in
 * `src/features/matchup/services/matchup-service.ts`; they are kept module-private
 * here so this feature module stays self-contained (matching the repo's
 * per-feature service convention).
 */
import type {
  CalendarSource,
  CalendarSyncStatus,
  GoogleCalendarDTO,
  SetSourceTargetBody,
  SourceMappingDTO,
  SourceToggleUpdate,
  SyncAllResult,
  SyncResult,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/** Build the auth header from the stored token, matching matchup-service. */
function authHeaders(isJson = true): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Token ${token}`,
    ...(isJson ? { 'Content-Type': 'application/json' } : {}),
  };
}

/** Extract a human-readable message from a DRF error response. */
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

/** Perform an authenticated JSON request and unwrap the response. */
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

/** Normalize a `CalendarSource` for the case-insensitive `<source>` path param. */
function sourcePath(source: CalendarSource): string {
  return source.toLowerCase();
}

export const calendarSyncService = {
  /** Connection status + per-source mapping summary. */
  status: () => request<CalendarSyncStatus>('/api/calendarsync/status/'),

  /** Soft-disconnect the Google account. */
  disconnect: () =>
    request<CalendarSyncStatus>('/api/calendarsync/status/', { method: 'DELETE' }),

  /** List the user's Google calendars (requires the full `calendar` scope). */
  listCalendars: () =>
    request<{ calendars: GoogleCalendarDTO[] }>('/api/calendarsync/calendars/'),

  /** Read all source mappings + toggle state. */
  getSettings: () =>
    request<{ sources: SourceMappingDTO[] }>('/api/calendarsync/settings/'),

  /** Bulk/partial update of per-source sync/push/pull toggles. */
  updateSettings: (sources: SourceToggleUpdate[]) =>
    request<{ sources: SourceMappingDTO[] }>('/api/calendarsync/settings/', {
      method: 'PUT',
      body: JSON.stringify({ sources }),
    }),

  /** Set a source's target calendar (pick existing or create a branded one). */
  setSourceTarget: (source: CalendarSource, body: SetSourceTargetBody) =>
    request<SourceMappingDTO>(`/api/calendarsync/settings/${sourcePath(source)}/`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  /** On-demand push + pull for every source. */
  syncAll: () => request<SyncAllResult>('/api/calendarsync/sync/', { method: 'POST' }),

  /** On-demand push + pull for a single source. */
  syncSource: (source: CalendarSource) =>
    request<SyncResult>(`/api/calendarsync/sync/${sourcePath(source)}/`, { method: 'POST' }),

  /**
   * Begin the Google OAuth connect flow. Reuses the shared `matchup` alias
   * (`/api/matchup/google/oauth/start/`); OAuth start/callback intentionally
   * stay in the matchup app on the backend.
   *
   * @param nextPath - Optional root-relative path to return to after consent
   *   (e.g. "/settings#settings-calendar-sync"). Sealed into the signed OAuth
   *   state server-side, so it survives the Google round-trip.
   */
  startGoogleOAuth: (nextPath?: string) =>
    request<{ authorization_url: string }>(
      `/api/matchup/google/oauth/start/${
        nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''
      }`,
    ),
};
