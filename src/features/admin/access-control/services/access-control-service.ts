import type {
  CreateFunctionPayload,
  CreateUserPermissionPayload,
  FunctionItem,
  PaginatedResponse,
  PermissionItem,
  UpdateFunctionPayload,
  UpdateUserPermissionPayload,
  UserFunctionItem,
  UserPermissionItem,
  UserSearchResult,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

/** Extract a human-readable error message from a DRF error response. */
async function parseError(response: Response): Promise<string> {
  const data = (await response.json().catch(() => null)) as unknown;
  if (!data || typeof data !== 'object') return `Request failed (${response.status})`;

  const record = data as Record<string, unknown>;
  const detail = record.detail;
  if (Array.isArray(detail)) return detail.join(', ');
  if (typeof detail === 'string') return detail;

  // First field-level error (e.g. { slug: ["already exists"] }).
  for (const value of Object.values(record)) {
    if (Array.isArray(value) && value.length && typeof value[0] === 'string') {
      return value[0];
    }
    if (typeof value === 'string') return value;
  }
  return `Request failed (${response.status})`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: getAuthHeaders(),
  });
  if (response.status === 204) return undefined as T;
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<T>;
}

/* ---------------------------------------------------------------- Functions */

export function listFunctions(): Promise<PaginatedResponse<FunctionItem>> {
  return request<PaginatedResponse<FunctionItem>>('/api/accounts/functions/');
}

export function createFunction(payload: CreateFunctionPayload): Promise<FunctionItem> {
  return request<FunctionItem>('/api/accounts/functions/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateFunction(id: number, payload: UpdateFunctionPayload): Promise<FunctionItem> {
  return request<FunctionItem>(`/api/accounts/functions/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteFunction(id: number): Promise<void> {
  return request<void>(`/api/accounts/functions/${id}/`, { method: 'DELETE' });
}

/* ------------------------------------------------------- Function assignments */

export function listUserFunctions(userId: number): Promise<PaginatedResponse<UserFunctionItem>> {
  return request<PaginatedResponse<UserFunctionItem>>(
    `/api/accounts/user-functions/?user=${userId}`,
  );
}

export function assignFunction(userId: number, functionId: number): Promise<UserFunctionItem> {
  return request<UserFunctionItem>('/api/accounts/user-functions/', {
    method: 'POST',
    body: JSON.stringify({ user: userId, function: functionId }),
  });
}

export function unassignUserFunction(id: number): Promise<void> {
  return request<void>(`/api/accounts/user-functions/${id}/`, { method: 'DELETE' });
}

/* -------------------------------------------------------------- Permissions */

/**
 * Fetches the full permission catalog, following pagination. Used to build the
 * distinct resource list (and the actions-per-resource map) for the cascading
 * picker. The endpoint paginates at 25/page (max 200 via page_size).
 */
export async function listAllPermissions(): Promise<PermissionItem[]> {
  const all: PermissionItem[] = [];
  for (let page = 1; page <= 100; page += 1) {
    const data = await request<PaginatedResponse<PermissionItem> | PermissionItem[]>(
      `/api/authz/permissions/?page=${page}&page_size=200`,
    );
    if (Array.isArray(data)) {
      all.push(...data);
      break;
    }
    all.push(...data.results);
    if (!data.next) break;
  }
  return all;
}

/**
 * Server-side permission lookup using the backend filters:
 *  - search: partial, case-insensitive match on resource OR action
 *  - resource / action: exact match
 * Kept for lazy/scalable use; the cascading picker currently derives its
 * options from listAllPermissions() so filtering is instant.
 */
export async function searchPermissions(params: {
  search?: string;
  resource?: string;
  action?: string;
}): Promise<PermissionItem[]> {
  const qs = new URLSearchParams();
  if (params.search?.trim()) qs.set('search', params.search.trim());
  if (params.resource) qs.set('resource', params.resource);
  if (params.action) qs.set('action', params.action);
  qs.set('page_size', '200');
  const data = await request<PaginatedResponse<PermissionItem> | PermissionItem[]>(
    `/api/authz/permissions/?${qs.toString()}`,
  );
  return toArray(data);
}

/* ------------------------------------------------- User permission overrides */

export function listUserPermissions(
  userId: number,
): Promise<PaginatedResponse<UserPermissionItem> | UserPermissionItem[]> {
  return request<PaginatedResponse<UserPermissionItem> | UserPermissionItem[]>(
    `/api/authz/user-permissions/?user=${userId}`,
  );
}

export function createUserPermission(
  payload: CreateUserPermissionPayload,
): Promise<UserPermissionItem> {
  return request<UserPermissionItem>('/api/authz/user-permissions/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateUserPermission(
  id: number,
  payload: UpdateUserPermissionPayload,
): Promise<UserPermissionItem> {
  return request<UserPermissionItem>(`/api/authz/user-permissions/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteUserPermission(id: number): Promise<void> {
  return request<void>(`/api/authz/user-permissions/${id}/`, { method: 'DELETE' });
}

/* --------------------------------------------------------------- User search */

export function searchUsers(
  query: string,
): Promise<PaginatedResponse<UserSearchResult> | UserSearchResult[]> {
  const qs = query.trim() ? `?search=${encodeURIComponent(query.trim())}` : '';
  return request<PaginatedResponse<UserSearchResult> | UserSearchResult[]>(
    `/api/accounts/users/${qs}`,
  );
}

/** Normalizes list endpoints that may return either a paginated object or a bare array. */
export function toArray<T>(data: PaginatedResponse<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results;
}
