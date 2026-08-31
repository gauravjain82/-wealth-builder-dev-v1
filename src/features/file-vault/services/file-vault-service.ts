import { isDirectPdfUrl } from '@/features/systematic-tools/components/fullscreen-viewer';
import type { FileVaultResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function getAuthToken(): string {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return token;
}

function getAuthHeaders(): HeadersInit {
  return {
    Authorization: `Token ${getAuthToken()}`,
    'Content-Type': 'application/json',
  };
}

export function getFileVaultAuthHeaders(): Record<string, string> {
  return { Authorization: `Token ${getAuthToken()}` };
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

export async function fetchFileVault(): Promise<FileVaultResponse> {
  const response = await fetch(`${API_BASE_URL}/api/content/file-vault/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<FileVaultResponse>;
}

export type FileVaultItemAccess = {
  href: string;
  thumb: string;
  allow_download: boolean;
  resource_type: string;
  is_pdf: boolean;
};

export type FileVaultViewerTarget = {
  src: string;
  title: string;
  allowDownload: boolean;
  httpHeaders?: Record<string, string>;
  forcePdf: boolean;
};

export type FileVaultOpenable = {
  id: number;
  title: string;
  href?: string;
  resource_type?: string;
  allow_download?: boolean;
  is_pdf?: boolean;
  gcs_blob_name?: string;
};

export async function fetchFileVaultItemAccess(id: number): Promise<FileVaultItemAccess> {
  const response = await fetch(`${API_BASE_URL}/api/content/file-vault/items/${id}/access/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<FileVaultItemAccess>;
}

export function fileVaultItemFileUrl(id: number, download = false): string {
  const qs = download ? '?download=1' : '';
  return `${API_BASE_URL}/api/content/file-vault/items/${id}/file/${qs}`;
}

export function isFileVaultPdf(item: FileVaultOpenable, href?: string): boolean {
  if (item.is_pdf) return true;
  if (item.resource_type === 'pdf') return true;
  const blob = item.gcs_blob_name?.toLowerCase() ?? '';
  if (blob.endsWith('.pdf')) return true;
  const candidates = [href, item.href];
  return candidates.some((url) => {
    if (!url || url === '#') return false;
    return url.toLowerCase().split('?')[0].endsWith('.pdf');
  });
}

export async function openFileVaultDocument(
  item: FileVaultOpenable,
  popup?: Window | null
): Promise<{ viewer: FileVaultViewerTarget } | { opened: true } | { failed: true }> {
  let access: FileVaultItemAccess | null = null;
  try {
    access = await fetchFileVaultItemAccess(item.id);
  } catch {
    access = null;
  }

  const href = access?.href || item.href || '';
  const isPdf = Boolean(access?.is_pdf) || isFileVaultPdf(item, href);
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
        src: fileVaultItemFileUrl(item.id),
        title: item.title,
        allowDownload,
        httpHeaders: getFileVaultAuthHeaders(),
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

export async function openFileVaultDocumentFromClick(item: FileVaultOpenable) {
  const popup = isFileVaultPdf(item) ? null : window.open('about:blank', '_blank');
  return openFileVaultDocument(item, popup);
}

