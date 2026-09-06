/**
 * Builder AI — shared HTTP primitives.
 *
 * A single seam for talking to the Django `builder` app (Decision 29): native
 * `fetch`, token from `localStorage['wb.authToken']`, `VITE_API_BASE_URL` base, and
 * DRF-aware error parsing. Both the read service (`builder-ai-service`) and the
 * config write service (`builder-config-service`) import from here so there is one
 * request path, not two.
 *
 * This module owns HTTP only — no React, no business logic (Decision 24 SRP).
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * An error carrying the HTTP status of a failed request. Callers that need to
 * branch on the status (e.g. hide UI on a 403 permission denial rather than on a
 * transient network failure) can `instanceof HttpError` and read `.status`.
 * Extends `Error`, so existing `(err as Error).message` handling is unaffected.
 */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** Build the Authorization header from the stored session token. */
function authHeaders(isJson = true): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Token ${token}`,
    ...(isJson ? { 'Content-Type': 'application/json' } : {}),
  };
}

/**
 * True when an error is the backend's "viewer has no builder program" signal
 * (`404` + the `No matching builder program` detail). Matched on the message too,
 * not just the status, so an unrelated 404 (misrouted URL, proxy) still surfaces as
 * a real error rather than a fake-empty screen. If the backend later adds a stable
 * `code`, switch this to key on that instead.
 */
export function isNoBuilderProgramError(error: unknown): boolean {
  return (
    error instanceof HttpError &&
    error.status === 404 &&
    /no matching builder program/i.test(error.message)
  );
}

/** Turn a non-2xx DRF response into a human-readable error message. */
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

/** Generic JSON request helper. Throws `Error` on non-2xx; returns `T`. */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...authHeaders(init?.body !== undefined),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    throw new HttpError(response.status, await parseError(response));
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

/** Serialize a params object into a `?a=b&c=d` query string (skips empties). */
export function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

/** Unwrap a DRF list response that may be paginated or a bare array. */
export function unwrapList<T>(data: Paginated<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results;
}

/** DRF paginated envelope (duplicated minimally to avoid a types.ts import cycle). */
interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
