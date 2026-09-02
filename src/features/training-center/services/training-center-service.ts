import {
  getJsonHeaders,
  openContentDocumentFromClick,
  request,
  type ContentItemEndpoints,
  type ContentOpenable,
  type ContentViewerTarget,
  type OpenContentResult,
} from '@shared/services/content-page-service';
import type {
  CompleteTrainingItemResponse,
  TrainingCenterResponse,
  TrainingProgress,
} from '../types';

export const TRAINING_CENTER_ENDPOINTS: ContentItemEndpoints = {
  accessPath: (id) => `/api/content/training-center/items/${id}/access/`,
  filePath: (id, download) =>
    `/api/content/training-center/items/${id}/file/${download ? '?download=1' : ''}`,
};

export type TrainingViewerTarget = ContentViewerTarget;

export async function fetchTrainingCenter(): Promise<TrainingCenterResponse> {
  return request<TrainingCenterResponse>('/api/content/training-center/', {
    headers: getJsonHeaders(),
  });
}

export async function fetchTrainingProgress(): Promise<TrainingProgress> {
  return request<TrainingProgress>('/api/content/training-center/progress/', {
    headers: getJsonHeaders(),
  });
}

/** Idempotent on the server: only the first completion awards XP. */
export async function completeTrainingItem(
  id: number
): Promise<CompleteTrainingItemResponse> {
  return request<CompleteTrainingItemResponse>(
    `/api/content/training-center/items/${id}/complete/`,
    { method: 'POST', headers: getJsonHeaders() }
  );
}

export async function openTrainingResource(
  item: ContentOpenable
): Promise<OpenContentResult> {
  return openContentDocumentFromClick(item, TRAINING_CENTER_ENDPOINTS);
}

const LEGACY_OPENED_KEY = 'training_opened';
const LEGACY_XP_KEY = 'training_xp';

/**
 * Read the pre-backend localStorage progress so it can be replayed to the API.
 *
 * Keys were `item.id` strings from the old hardcoded catalog (e.g. `code-1`),
 * which the seed command preserves as `item_key`.
 */
export function readLegacyProgressKeys(): string[] {
  try {
    const raw = localStorage.getItem(LEGACY_OPENED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return Object.entries(parsed)
      .filter(([, opened]) => opened)
      .map(([key]) => key);
  } catch {
    return [];
  }
}

export function clearLegacyProgress(): void {
  localStorage.removeItem(LEGACY_OPENED_KEY);
  localStorage.removeItem(LEGACY_XP_KEY);
}
