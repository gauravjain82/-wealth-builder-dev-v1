import {
  contentItemFileUrl,
  fetchContentItemAccess,
  getAuthHeaders,
  getJsonHeaders,
  isContentPdf,
  openContentDocument,
  openContentDocumentFromClick,
  request,
  type ContentItemAccess,
  type ContentItemEndpoints,
  type ContentOpenable,
  type ContentViewerTarget,
  type OpenContentResult,
} from '@shared/services/content-page-service';
import type { FileVaultResponse } from '../types';

export const FILE_VAULT_ENDPOINTS: ContentItemEndpoints = {
  accessPath: (id) => `/api/content/file-vault/items/${id}/access/`,
  filePath: (id, download) =>
    `/api/content/file-vault/items/${id}/file/${download ? '?download=1' : ''}`,
};

export type FileVaultItemAccess = ContentItemAccess;
export type FileVaultViewerTarget = ContentViewerTarget;
export type FileVaultOpenable = ContentOpenable;

export function getFileVaultAuthHeaders(): Record<string, string> {
  return getAuthHeaders();
}

export async function fetchFileVault(): Promise<FileVaultResponse> {
  return request<FileVaultResponse>('/api/content/file-vault/', {
    headers: getJsonHeaders(),
  });
}

export async function fetchFileVaultItemAccess(id: number): Promise<FileVaultItemAccess> {
  return fetchContentItemAccess(FILE_VAULT_ENDPOINTS, id);
}

export function fileVaultItemFileUrl(id: number, download = false): string {
  return contentItemFileUrl(FILE_VAULT_ENDPOINTS, id, download);
}

export function isFileVaultPdf(item: FileVaultOpenable, href?: string): boolean {
  return isContentPdf(item, href);
}

export async function openFileVaultDocument(
  item: FileVaultOpenable,
  popup?: Window | null
): Promise<OpenContentResult> {
  return openContentDocument(item, FILE_VAULT_ENDPOINTS, popup);
}

export async function openFileVaultDocumentFromClick(
  item: FileVaultOpenable
): Promise<OpenContentResult> {
  return openContentDocumentFromClick(item, FILE_VAULT_ENDPOINTS);
}
