import type {
  FileVaultConfig,
  FileVaultItemAdmin,
  FileVaultItemPayload,
  FileVaultSectionAdmin,
  FileVaultSectionPayload,
} from '@/features/file-vault/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function getAuthHeaders(contentType?: string): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  const headers: HeadersInit = { Authorization: `Token ${token}` };
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  return headers;
}

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
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (response.status === 204) return undefined as T;
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<T>;
}

export async function fetchFileVaultConfig(): Promise<FileVaultConfig> {
  return request<FileVaultConfig>('/api/content/admin/file-vault/config/', {
    headers: getAuthHeaders(),
  });
}

export async function updateFileVaultConfig(
  payload: Partial<Pick<FileVaultConfig, 'page_title' | 'search_enabled'>>
): Promise<FileVaultConfig> {
  return request<FileVaultConfig>('/api/content/admin/file-vault/config/', {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function listFileVaultSections(): Promise<FileVaultSectionAdmin[]> {
  return request<FileVaultSectionAdmin[]>('/api/content/admin/file-vault/sections/', {
    headers: getAuthHeaders(),
  });
}

export async function createFileVaultSection(
  payload: FileVaultSectionPayload
): Promise<FileVaultSectionAdmin> {
  return request<FileVaultSectionAdmin>('/api/content/admin/file-vault/sections/', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function updateFileVaultSection(
  id: number,
  payload: Partial<FileVaultSectionPayload>
): Promise<FileVaultSectionAdmin> {
  return request<FileVaultSectionAdmin>(`/api/content/admin/file-vault/sections/${id}/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function deleteFileVaultSection(id: number): Promise<void> {
  await request<void>(`/api/content/admin/file-vault/sections/${id}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

export async function updateFileVaultSectionRoles(
  id: number,
  roles: string[]
): Promise<FileVaultSectionAdmin> {
  return request<FileVaultSectionAdmin>(`/api/content/admin/file-vault/sections/${id}/roles/`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ roles }),
  });
}

export async function reorderFileVaultSections(ids: number[]): Promise<void> {
  await request('/api/content/admin/file-vault/sections/reorder/', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ ids }),
  });
}

export async function listFileVaultItems(sectionId: number): Promise<FileVaultItemAdmin[]> {
  return request<FileVaultItemAdmin[]>(
    `/api/content/admin/file-vault/items/?section=${sectionId}`,
    { headers: getAuthHeaders() }
  );
}

export async function createFileVaultItem(
  payload: FileVaultItemPayload
): Promise<FileVaultItemAdmin> {
  return request<FileVaultItemAdmin>('/api/content/admin/file-vault/items/', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function updateFileVaultItem(
  id: number,
  payload: Partial<FileVaultItemPayload>
): Promise<FileVaultItemAdmin> {
  return request<FileVaultItemAdmin>(`/api/content/admin/file-vault/items/${id}/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function deleteFileVaultItem(id: number): Promise<void> {
  await request<void>(`/api/content/admin/file-vault/items/${id}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

export async function updateFileVaultItemRoles(
  id: number,
  roles: string[]
): Promise<FileVaultItemAdmin> {
  return request<FileVaultItemAdmin>(`/api/content/admin/file-vault/items/${id}/roles/`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ roles }),
  });
}

export async function reorderFileVaultItems(ids: number[]): Promise<void> {
  await request('/api/content/admin/file-vault/items/reorder/', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ ids }),
  });
}

export async function uploadFileVaultItemFile(
  id: number,
  file: File,
  uploadType: 'file' | 'thumbnail' = 'file'
): Promise<{ blob_name: string; url: string; item: FileVaultItemAdmin }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_type', uploadType);

  const response = await fetch(
    `${API_BASE_URL}/api/content/admin/file-vault/items/${id}/upload/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${localStorage.getItem('wb.authToken')}`,
      },
      body: formData,
    }
  );
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<{ blob_name: string; url: string; item: FileVaultItemAdmin }>;
}
