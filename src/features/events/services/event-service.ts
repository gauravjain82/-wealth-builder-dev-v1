import type { BigEvent, BigEventListItem, BigEventPayload, EventFilters, PaginatedResponse } from '../types/event';

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
    headers: { ...authHeaders(init?.body !== undefined), ...init?.headers },
  });
  if (!response.ok) throw new Error(await parseError(response));
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null> | object): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  return entries.length ? '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString() : '';
}

// The events router is mounted at /api/events/ and registers the `events`
// resource, so the collection lives at /api/events/events/.
const EVENTS_BASE = '/api/events/events';

export const eventService = {
  list(filters: EventFilters = {}): Promise<PaginatedResponse<BigEventListItem>> {
    return request(`${EVENTS_BASE}/${buildQuery(filters)}`);
  },

  get(id: number): Promise<BigEvent> {
    return request(`${EVENTS_BASE}/${id}/`);
  },

  create(payload: BigEventPayload): Promise<BigEvent> {
    return request(`${EVENTS_BASE}/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  partialUpdate(id: number, payload: Partial<BigEventPayload>): Promise<BigEvent> {
    return request(`${EVENTS_BASE}/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  remove(id: number): Promise<void> {
    return request(`${EVENTS_BASE}/${id}/`, { method: 'DELETE' });
  },

  publish(id: number): Promise<BigEvent> {
    return request(`${EVENTS_BASE}/${id}/publish/`, { method: 'POST' });
  },

  clone(id: number): Promise<BigEvent> {
    return request(`${EVENTS_BASE}/${id}/clone/`, { method: 'POST' });
  },

  // Field name is part of the URL; the multipart body carries only the file.
  // Backend action: POST /events/{id}/upload/{field_name}/ → {field_name, blob_name}.
  async uploadImage(
    id: number,
    fieldName: string,
    file: File,
  ): Promise<{ field_name: string; blob_name: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return request(`${EVENTS_BASE}/${id}/upload/${fieldName}/`, {
      method: 'POST',
      body: formData,
      headers: authHeaders(false),
    });
  },
};
