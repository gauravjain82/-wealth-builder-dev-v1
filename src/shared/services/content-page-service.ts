/**
 * Shared client helpers for CMS-managed content pages (File Vault, Training Center).
 *
 * The backend serves these pages from the same machinery, so the client side
 * shares one auth/error/document-opening implementation too.
 */

import { isDirectPdfUrl } from '@/features/systematic-tools/components/fullscreen-viewer';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function getAuthToken(): string {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return token;
}

export function getAuthHeaders(): Record<string, string> {
  return { Authorization: `Token ${getAuthToken()}` };
}

export function getJsonHeaders(): Record<string, string> {
  return { ...getAuthHeaders(), 'Content-Type': 'application/json' };
}

export async function parseError(response: Response): Promise<string> {
  if (response.status === 413) {
    return 'This file is too large for the server (HTTP 413). The API proxy rejected it before it reached cloud storage. For videos, use External link instead of uploading the file here.';
  }

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

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (response.status === 204) return undefined as T;
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<T>;
}

/** Signed-URL response from a `.../items/{id}/access/` endpoint. */
export type ContentItemAccess = {
  href: string;
  thumb: string;
  allow_download: boolean;
  resource_type: string;
  is_pdf: boolean;
};

/** The minimum an item needs for the opener to decide how to render it. */
export type ContentOpenable = {
  id: number;
  title: string;
  href?: string;
  resource_type?: string;
  allow_download?: boolean;
  is_pdf?: boolean;
  gcs_blob_name?: string;
};

export type ContentViewerTarget = {
  src: string;
  title: string;
  allowDownload: boolean;
  httpHeaders?: Record<string, string>;
  forcePdf: boolean;
};

/** Per-page URL builders, so one opener serves every content page. */
export type ContentItemEndpoints = {
  accessPath: (id: number) => string;
  filePath: (id: number, download?: boolean) => string;
};

export type OpenContentResult =
  | { viewer: ContentViewerTarget }
  | { opened: true }
  | { failed: true };

export function isContentPdf(item: ContentOpenable, href?: string): boolean {
  if (item.is_pdf) return true;
  if (item.resource_type === 'pdf') return true;
  const blob = item.gcs_blob_name?.toLowerCase() ?? '';
  if (blob.endsWith('.pdf')) return true;
  return [href, item.href].some((url) => {
    if (!url || url === '#') return false;
    return url.toLowerCase().split('?')[0].endsWith('.pdf');
  });
}

export async function fetchContentItemAccess(
  endpoints: ContentItemEndpoints,
  id: number
): Promise<ContentItemAccess> {
  return request<ContentItemAccess>(endpoints.accessPath(id), {
    headers: getJsonHeaders(),
  });
}

export function contentItemFileUrl(
  endpoints: ContentItemEndpoints,
  id: number,
  download = false
): string {
  return `${API_BASE_URL}${endpoints.filePath(id, download)}`;
}

/**
 * Resolve an item to either an in-app viewer target or a new browser tab.
 *
 * PDFs are always routed through the API stream so no downloadable URL is
 * exposed when downloads are disabled.
 */
export async function openContentDocument(
  item: ContentOpenable,
  endpoints: ContentItemEndpoints,
  popup?: Window | null
): Promise<OpenContentResult> {
  let access: ContentItemAccess | null = null;
  try {
    access = await fetchContentItemAccess(endpoints, item.id);
  } catch {
    access = null;
  }

  const href = access?.href || item.href || '';
  const isPdf = Boolean(access?.is_pdf) || isContentPdf(item, href);
  const allowDownload = Boolean(access?.allow_download ?? item.allow_download);

  if (isPdf) {
    popup?.close();
    const externalHref = href && href !== '#' ? href : '';
    if (externalHref) {
      return {
        viewer: {
          src: externalHref,
          title: item.title,
          allowDownload,
          forcePdf: isDirectPdfUrl(externalHref),
        },
      };
    }
    return {
      viewer: {
        src: contentItemFileUrl(endpoints, item.id),
        title: item.title,
        allowDownload,
        httpHeaders: getAuthHeaders(),
        forcePdf: true,
      },
    };
  }

  const tabUrl = href && href !== '#' ? href : '';
  if (tabUrl) {
    if (popup) {
      popup.opener = null;
      popup.location.replace(tabUrl);
    } else {
      window.open(tabUrl, '_blank', 'noopener,noreferrer');
    }
    return { opened: true };
  }

  popup?.close();
  return { failed: true };
}

/**
 * Same as {@link openContentDocument}, but opens the placeholder tab
 * synchronously so popup blockers treat it as user-initiated.
 */
export async function openContentDocumentFromClick(
  item: ContentOpenable,
  endpoints: ContentItemEndpoints
): Promise<OpenContentResult> {
  const popup = isContentPdf(item) ? null : window.open('about:blank', '_blank');
  return openContentDocument(item, endpoints, popup);
}
