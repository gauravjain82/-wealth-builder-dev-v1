import {
  getJsonHeaders,
  openContentDocumentFromClick,
  request,
  type ContentItemEndpoints,
  type ContentOpenable,
  type OpenContentResult,
} from '@shared/services/content-page-service';
import type { SystematicToolsResponse } from '../types';

export const SYSTEMATIC_TOOLS_ENDPOINTS: ContentItemEndpoints = {
  accessPath: (id) => `/api/content/systematic-tools/items/${id}/access/`,
  filePath: (id, download) =>
    `/api/content/systematic-tools/items/${id}/file/${download ? '?download=1' : ''}`,
};

/** Tools and contents the current user may see (filtered by role on the server). */
export async function fetchSystematicTools(): Promise<SystematicToolsResponse> {
  return request<SystematicToolsResponse>('/api/content/systematic-tools/', {
    headers: getJsonHeaders(),
  });
}

/** Open a PDF (view-only stream unless downloads are allowed) or other document. */
export async function openSystematicToolResource(
  item: ContentOpenable
): Promise<OpenContentResult> {
  return openContentDocumentFromClick(item, SYSTEMATIC_TOOLS_ENDPOINTS);
}

/** Saved menus from the old in-page editor; the backend is the source of truth now. */
const LEGACY_MENU_KEYS = ['tenTools:menu:v2', 'tenTools:menu'];

export function clearLegacyToolMenus(): void {
  for (const key of LEGACY_MENU_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage can be unavailable (private mode); nothing to clean up then.
    }
  }
}
