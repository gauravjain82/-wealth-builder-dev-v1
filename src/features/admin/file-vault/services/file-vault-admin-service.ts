import {
  API_BASE_URL,
  getAuthHeaders,
  getJsonHeaders,
  parseError,
  request,
} from '@shared/services/content-page-service';
import type {
  FileVaultConfig,
  FileVaultItemAdmin,
  FileVaultSectionAdmin,
} from '@/features/file-vault/types';
import type { ContentUploadResult } from '@/features/admin/content-pages/types';

const BASE = '/api/content/admin/file-vault';

export async function fetchFileVaultConfig(): Promise<FileVaultConfig> {
  return request<FileVaultConfig>(`${BASE}/config/`, { headers: getAuthHeaders() });
}

export async function updateFileVaultConfig(
  payload: Partial<Pick<FileVaultConfig, 'page_title' | 'search_enabled'>>
): Promise<FileVaultConfig> {
  return request<FileVaultConfig>(`${BASE}/config/`, {
    method: 'PATCH',
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function listFileVaultSections(): Promise<FileVaultSectionAdmin[]> {
  return request<FileVaultSectionAdmin[]>(`${BASE}/sections/`, {
    headers: getAuthHeaders(),
  });
}

export async function createFileVaultSection(
  payload: Record<string, unknown>
): Promise<FileVaultSectionAdmin> {
  return request<FileVaultSectionAdmin>(`${BASE}/sections/`, {
    method: 'POST',
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function updateFileVaultSection(
  id: number,
  payload: Record<string, unknown>
): Promise<FileVaultSectionAdmin> {
  return request<FileVaultSectionAdmin>(`${BASE}/sections/${id}/`, {
    method: 'PATCH',
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function deleteFileVaultSection(id: number): Promise<void> {
  await request<void>(`${BASE}/sections/${id}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

export async function updateFileVaultSectionRoles(
  id: number,
  roles: string[]
): Promise<FileVaultSectionAdmin> {
  return request<FileVaultSectionAdmin>(`${BASE}/sections/${id}/roles/`, {
    method: 'PUT',
    headers: getJsonHeaders(),
    body: JSON.stringify({ roles }),
  });
}

export async function reorderFileVaultSections(ids: number[]): Promise<void> {
  await request(`${BASE}/sections/reorder/`, {
    method: 'POST',
    headers: getJsonHeaders(),
    body: JSON.stringify({ ids }),
  });
}

export async function listFileVaultItems(sectionId: number): Promise<FileVaultItemAdmin[]> {
  return request<FileVaultItemAdmin[]>(`${BASE}/items/?section=${sectionId}`, {
    headers: getAuthHeaders(),
  });
}

export async function createFileVaultItem(
  payload: Record<string, unknown>
): Promise<FileVaultItemAdmin> {
  return request<FileVaultItemAdmin>(`${BASE}/items/`, {
    method: 'POST',
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function updateFileVaultItem(
  id: number,
  payload: Record<string, unknown>
): Promise<FileVaultItemAdmin> {
  return request<FileVaultItemAdmin>(`${BASE}/items/${id}/`, {
    method: 'PATCH',
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function deleteFileVaultItem(id: number): Promise<void> {
  await request<void>(`${BASE}/items/${id}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

export async function updateFileVaultItemRoles(
  id: number,
  roles: string[]
): Promise<FileVaultItemAdmin> {
  return request<FileVaultItemAdmin>(`${BASE}/items/${id}/roles/`, {
    method: 'PUT',
    headers: getJsonHeaders(),
    body: JSON.stringify({ roles }),
  });
}

export async function reorderFileVaultItems(ids: number[]): Promise<void> {
  await request(`${BASE}/items/reorder/`, {
    method: 'POST',
    headers: getJsonHeaders(),
    body: JSON.stringify({ ids }),
  });
}

export async function uploadFileVaultItemFile(
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
