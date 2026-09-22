/** Admin API client for managing the member home page (config + media slots). */

import {
  API_BASE_URL,
  getAuthHeaders,
  getJsonHeaders,
  parseError,
  request,
} from '@shared/services/content-page-service';
import type {
  HomePageConfig,
  HomePageMedia,
} from '@/features/home/services/home-content-service';

const BASE = '/api/content/admin/home-page';

export type HomeMediaUploadResult = {
  blob_name: string;
  url: string;
  media: HomePageMedia;
};

export async function fetchHomeConfig(): Promise<HomePageConfig> {
  return request<HomePageConfig>(`${BASE}/config/`, { headers: getAuthHeaders() });
}

export async function updateHomeConfig(
  payload: Partial<Pick<HomePageConfig, 'hero_title' | 'register_url'>>
): Promise<HomePageConfig> {
  return request<HomePageConfig>(`${BASE}/config/`, {
    method: 'PATCH',
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function listHomeMedia(): Promise<HomePageMedia[]> {
  return request<HomePageMedia[]>(`${BASE}/media/`, { headers: getAuthHeaders() });
}

export async function updateHomeMedia(
  id: number,
  payload: Partial<Pick<HomePageMedia, 'label' | 'href' | 'media_type' | 'is_active'>>
): Promise<HomePageMedia> {
  return request<HomePageMedia>(`${BASE}/media/${id}/`, {
    method: 'PATCH',
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function uploadHomeMedia(
  id: number,
  file: File
): Promise<HomeMediaUploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}${BASE}/media/${id}/upload/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<HomeMediaUploadResult>;
}
