import type {
  AccountMap,
  AccountSearchHit,
  DecidePayload,
  ExternalImport,
  ImportRow,
  ImportRowDetail,
  Paged,
  ResolvePayload,
  ReviewItem,
  RowFilters,
  SponsorFilters,
  SponsorRow,
  SponsorSummary,
} from '../types/external-tickets';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/** Error carrying the backend's stable `code` (e.g. `stale_revision`). */
export class IntakeApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

function authHeaders(isJson: boolean): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return { Authorization: `Token ${token}`, ...(isJson ? { 'Content-Type': 'application/json' } : {}) };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(init.body !== undefined && !isForm), ...init.headers },
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { detail?: string; code?: string } | null;
    throw new IntakeApiError(
      data?.detail || `Request failed (${response.status})`,
      data?.code || 'request_failed',
      response.status,
    );
  }
  return response.json() as Promise<T>;
}

function query(params: object): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()}` : '';
}

const base = (eventId: number) => `/api/events/events/${eventId}/external-tickets`;

/**
 * External Tickets API. Every call is scoped to one event; the backend checks
 * Purchases access on each request.
 */
export const externalTicketService = {
  listImports: (eventId: number, signal?: AbortSignal) =>
    request<Paged<ExternalImport>>(`${base(eventId)}/imports/`, { signal }),

  getImport: (eventId: number, importId: number, signal?: AbortSignal) =>
    request<ExternalImport>(`${base(eventId)}/imports/${importId}/`, { signal }),

  upload: (eventId: number, file: File, capturedAt: string) => {
    const body = new FormData();
    body.append('file', file);
    body.append('provider', 'bscpro');
    body.append('captured_at', capturedAt);
    body.append('coverage', 'unknown');
    return request<ExternalImport>(`${base(eventId)}/imports/`, { method: 'POST', body });
  },

  analyze: (eventId: number, importId: number, stage: 'sponsors' | 'holders') =>
    request<{ counts: Record<string, number> | null }>(`${base(eventId)}/imports/${importId}/analyze/`, {
      method: 'POST',
      body: JSON.stringify({ stage }),
    }),

  preview: (eventId: number, importId: number) =>
    request<ExternalImport>(`${base(eventId)}/imports/${importId}/preview/`, { method: 'POST', body: '{}' }),

  apply: (eventId: number, imp: ExternalImport, idempotencyKey: string) =>
    request<ExternalImport>(`${base(eventId)}/imports/${imp.id}/apply/`, {
      method: 'POST',
      body: JSON.stringify({
        expected_import_revision: imp.revision,
        expected_source_revision: imp.active_source_revision ?? '',
        idempotency_key: idempotencyKey,
      }),
    }),

  listRows: (eventId: number, importId: number, filters: RowFilters, signal?: AbortSignal) =>
    request<Paged<ImportRow>>(`${base(eventId)}/imports/${importId}/rows/${query(filters)}`, { signal }),

  getRow: (eventId: number, importId: number, rowId: number, signal?: AbortSignal) =>
    request<ImportRowDetail>(`${base(eventId)}/imports/${importId}/rows/${rowId}/`, { signal }),

  listSponsors: (eventId: number, importId: number, filters: SponsorFilters, signal?: AbortSignal) =>
    request<Paged<SponsorRow> & { summary: SponsorSummary }>(
      `${base(eventId)}/imports/${importId}/sponsors/${query(filters)}`,
      { signal },
    ),

  decide: (eventId: number, mapId: number, payload: DecidePayload) =>
    request<{ maps: AccountMap[] }>(`${base(eventId)}/maps/${mapId}/decide/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  searchAccounts: (eventId: number, q: string, signal?: AbortSignal) =>
    request<{ rows: AccountSearchHit[]; next_cursor: number | null }>(
      `${base(eventId)}/accounts/search/${query({ q, limit: 20 })}`,
      { signal },
    ),

  listChanges: (eventId: number, params: { review_state?: string; kind?: string; page?: number }, signal?: AbortSignal) =>
    request<Paged<ReviewItem>>(`${base(eventId)}/changes/${query(params)}`, { signal }),

  resolve: (eventId: number, changeId: number, payload: ResolvePayload) =>
    request<{ id: number; review_state: string }>(`${base(eventId)}/changes/${changeId}/resolve/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
