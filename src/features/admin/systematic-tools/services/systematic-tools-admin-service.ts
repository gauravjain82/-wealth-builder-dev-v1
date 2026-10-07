import {
  API_BASE_URL,
  getAuthHeaders,
  getJsonHeaders,
  parseError,
  request,
} from '@shared/services/content-page-service';
import type {
  SystematicToolAdmin,
  SystematicToolItemAdmin,
  SystematicToolsConfig,
  SystematicToolsResponse,
} from '@/features/systematic-tools/types';
import type { ContentUploadResult, RoleOption } from '@/features/admin/content-pages/types';

const BASE = '/api/content/admin/systematic-tools';

export async function fetchSystematicToolsConfig(): Promise<SystematicToolsConfig> {
  return request<SystematicToolsConfig>(`${BASE}/config/`, { headers: getAuthHeaders() });
}

export async function updateSystematicToolsConfig(
  payload: Partial<SystematicToolsConfig>
): Promise<SystematicToolsConfig> {
  return request<SystematicToolsConfig>(`${BASE}/config/`, {
    method: 'PATCH',
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function listSystematicTools(): Promise<SystematicToolAdmin[]> {
  return request<SystematicToolAdmin[]>(`${BASE}/sections/`, { headers: getAuthHeaders() });
}

/** `section_key` may be omitted; the backend derives a unique slug from `label`. */
export async function createSystematicTool(
  payload: Record<string, unknown>
): Promise<SystematicToolAdmin> {
  return request<SystematicToolAdmin>(`${BASE}/sections/`, {
    method: 'POST',
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function updateSystematicTool(
  id: number,
  payload: Record<string, unknown>
): Promise<SystematicToolAdmin> {
  return request<SystematicToolAdmin>(`${BASE}/sections/${id}/`, {
    method: 'PATCH',
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function deleteSystematicTool(id: number): Promise<void> {
  await request<void>(`${BASE}/sections/${id}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

/** Empty `roles` = everyone. */
export async function updateSystematicToolRoles(
  id: number,
  roles: string[]
): Promise<SystematicToolAdmin> {
  return request<SystematicToolAdmin>(`${BASE}/sections/${id}/roles/`, {
    method: 'PUT',
    headers: getJsonHeaders(),
    body: JSON.stringify({ roles }),
  });
}

export async function reorderSystematicTools(ids: number[]): Promise<void> {
  await request(`${BASE}/sections/reorder/`, {
    method: 'POST',
    headers: getJsonHeaders(),
    body: JSON.stringify({ ids }),
  });
}

export async function listSystematicToolItems(
  sectionId: number
): Promise<SystematicToolItemAdmin[]> {
  return request<SystematicToolItemAdmin[]>(`${BASE}/items/?section=${sectionId}`, {
    headers: getAuthHeaders(),
  });
}

export async function createSystematicToolItem(
  payload: Record<string, unknown>
): Promise<SystematicToolItemAdmin> {
  return request<SystematicToolItemAdmin>(`${BASE}/items/`, {
    method: 'POST',
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function updateSystematicToolItem(
  id: number,
  payload: Record<string, unknown>
): Promise<SystematicToolItemAdmin> {
  return request<SystematicToolItemAdmin>(`${BASE}/items/${id}/`, {
    method: 'PATCH',
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function deleteSystematicToolItem(id: number): Promise<void> {
  await request<void>(`${BASE}/items/${id}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

/** Empty `roles` = everyone who can see the parent tool. */
export async function updateSystematicToolItemRoles(
  id: number,
  roles: string[]
): Promise<SystematicToolItemAdmin> {
  return request<SystematicToolItemAdmin>(`${BASE}/items/${id}/roles/`, {
    method: 'PUT',
    headers: getJsonHeaders(),
    body: JSON.stringify({ roles }),
  });
}

/** Reorder the contents of one tool; the backend rejects ids from another tool. */
export async function reorderSystematicToolItems(
  ids: number[],
  sectionId: number
): Promise<void> {
  await request(`${BASE}/items/reorder/`, {
    method: 'POST',
    headers: getJsonHeaders(),
    body: JSON.stringify({ section: sectionId, ids }),
  });
}

export async function uploadSystematicToolItemFile(
  id: number,
  file: File,
  uploadType: 'file' | 'thumbnail' = 'file'
): Promise<ContentUploadResult> {
  const formData = new FormData();
  formData.append(uploadType === 'thumbnail' ? 'thumbnail' : 'file', file);
  formData.append('upload_type', uploadType);

  const response = await fetch(`${API_BASE_URL}${BASE}/items/${id}/upload/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<ContentUploadResult>;
}

/** The user page exactly as someone holding only `role` would see it. */
export async function previewSystematicToolsAsRole(
  role: string
): Promise<SystematicToolsResponse> {
  return request<SystematicToolsResponse>(
    `${BASE}/preview/?role=${encodeURIComponent(role)}`,
    { headers: getAuthHeaders() }
  );
}

/** Roles offered by the "Visible to" pickers, ordered by rank. */
export async function listSystematicToolRoles(): Promise<RoleOption[]> {
  return request<RoleOption[]>(`${BASE}/roles/`, { headers: getAuthHeaders() });
}
