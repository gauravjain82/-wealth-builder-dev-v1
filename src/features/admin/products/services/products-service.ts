/**
 * API client for the Product Management UI. Talks to the Django `tracker` app's
 * product-catalog endpoints (`/api/tracker/products/`) plus the shared audit
 * history API (`/api/audit/`) for a product's change history.
 */

import type {
  AuditEntry,
  CreateProductPayload,
  PaginatedResponse,
  Product,
  ProductsAccess,
  UpdateProductPayload,
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

/** Normalizes list endpoints that may return a paginated object or a bare array. */
function toArray<T>(data: PaginatedResponse<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results;
}

/* ------------------------------------------------------------------ Access */

export function fetchProductsAccess(): Promise<ProductsAccess> {
  return request<ProductsAccess>('/api/tracker/products/my-access/');
}

/* ----------------------------------------------------------------- Products */

export async function listProducts(): Promise<Product[]> {
  const data = await request<PaginatedResponse<Product> | Product[]>(
    '/api/tracker/products/',
  );
  return toArray(data);
}

export function createProduct(payload: CreateProductPayload): Promise<Product> {
  return request<Product>('/api/tracker/products/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateProduct(id: number, payload: UpdateProductPayload): Promise<Product> {
  return request<Product>(`/api/tracker/products/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deactivateProduct(id: number): Promise<Product> {
  return request<Product>(`/api/tracker/products/${id}/deactivate/`, { method: 'POST' });
}

export function activateProduct(id: number): Promise<Product> {
  return request<Product>(`/api/tracker/products/${id}/activate/`, { method: 'POST' });
}

/* ------------------------------------------------------------------ History */

/** Change history for one product, newest first, from the shared audit API. */
export async function fetchProductHistory(
  contentTypeId: number,
  productId: number,
): Promise<AuditEntry[]> {
  const data = await request<PaginatedResponse<AuditEntry> | AuditEntry[]>(
    `/api/audit/?content_type=${contentTypeId}&object_id=${productId}`,
  );
  return toArray(data);
}
