import {
  API_BASE_URL,
  getAuthHeaders,
  getJsonHeaders,
  parseError,
  request,
} from '@shared/services/content-page-service';
import type {
  TrainingCenterConfig,
  TrainingCenterItemAdmin,
  TrainingCenterSectionAdmin,
} from '@/features/training-center/types';
import type { ContentUploadResult } from '@/features/admin/content-pages/types';

const BASE = '/api/content/admin/training-center';

export async function fetchTrainingCenterConfig(): Promise<TrainingCenterConfig> {
  return request<TrainingCenterConfig>(`${BASE}/config/`, { headers: getAuthHeaders() });
}

export async function updateTrainingCenterConfig(
  payload: Partial<
    Pick<TrainingCenterConfig, 'page_title' | 'page_subtitle' | 'search_enabled' | 'xp_per_level'>
  >
): Promise<TrainingCenterConfig> {
  return request<TrainingCenterConfig>(`${BASE}/config/`, {
    method: 'PATCH',
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function listTrainingCenterSections(): Promise<TrainingCenterSectionAdmin[]> {
  return request<TrainingCenterSectionAdmin[]>(`${BASE}/sections/`, {
    headers: getAuthHeaders(),
  });
}

export async function createTrainingCenterSection(
  payload: Record<string, unknown>
): Promise<TrainingCenterSectionAdmin> {
  return request<TrainingCenterSectionAdmin>(`${BASE}/sections/`, {
    method: 'POST',
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function updateTrainingCenterSection(
  id: number,
  payload: Record<string, unknown>
): Promise<TrainingCenterSectionAdmin> {
  return request<TrainingCenterSectionAdmin>(`${BASE}/sections/${id}/`, {
    method: 'PATCH',
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function deleteTrainingCenterSection(id: number): Promise<void> {
  await request<void>(`${BASE}/sections/${id}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

export async function updateTrainingCenterSectionRoles(
  id: number,
  roles: string[]
): Promise<TrainingCenterSectionAdmin> {
  return request<TrainingCenterSectionAdmin>(`${BASE}/sections/${id}/roles/`, {
    method: 'PUT',
    headers: getJsonHeaders(),
    body: JSON.stringify({ roles }),
  });
}

export async function reorderTrainingCenterSections(ids: number[]): Promise<void> {
  await request(`${BASE}/sections/reorder/`, {
    method: 'POST',
    headers: getJsonHeaders(),
    body: JSON.stringify({ ids }),
  });
}

export async function listTrainingCenterItems(
  sectionId: number
): Promise<TrainingCenterItemAdmin[]> {
  return request<TrainingCenterItemAdmin[]>(`${BASE}/items/?section=${sectionId}`, {
    headers: getAuthHeaders(),
  });
}

export async function createTrainingCenterItem(
  payload: Record<string, unknown>
): Promise<TrainingCenterItemAdmin> {
  return request<TrainingCenterItemAdmin>(`${BASE}/items/`, {
    method: 'POST',
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function updateTrainingCenterItem(
  id: number,
  payload: Record<string, unknown>
): Promise<TrainingCenterItemAdmin> {
  return request<TrainingCenterItemAdmin>(`${BASE}/items/${id}/`, {
    method: 'PATCH',
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function deleteTrainingCenterItem(id: number): Promise<void> {
  await request<void>(`${BASE}/items/${id}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

export async function updateTrainingCenterItemRoles(
  id: number,
  roles: string[]
): Promise<TrainingCenterItemAdmin> {
  return request<TrainingCenterItemAdmin>(`${BASE}/items/${id}/roles/`, {
    method: 'PUT',
    headers: getJsonHeaders(),
    body: JSON.stringify({ roles }),
  });
}

export async function reorderTrainingCenterItems(ids: number[]): Promise<void> {
  await request(`${BASE}/items/reorder/`, {
    method: 'POST',
    headers: getJsonHeaders(),
    body: JSON.stringify({ ids }),
  });
}

export async function uploadTrainingCenterItemFile(
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
