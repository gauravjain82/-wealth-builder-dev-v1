import type { FileVaultResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
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

export async function openFileVaultItem(id: number, fallbackHref?: string): Promise<void> {
  const popup = window.open('about:blank', '_blank');

  const navigate = (url: string) => {
    if (popup) {
      popup.opener = null;
      popup.location.replace(url);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const closePopup = () => {
    popup?.close();
  };

  try {
    const access = await fetchFileVaultItemAccess(id);
    const url = access.href || fallbackHref || '';
    if (url && url !== '#') {
      navigate(url);
      return;
    }
    closePopup();
  } catch {
    if (fallbackHref && fallbackHref.startsWith('http')) {
      navigate(fallbackHref);
      return;
    }
    closePopup();
  }
}
