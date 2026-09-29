/**
 * API client for the one `wbreporting` capability endpoint.
 *
 * `my-access/` is authenticated-only on the backend, so asking never provokes a 403;
 * every gated endpoint re-checks its own permission, so this answer decides what to
 * render, never what is permitted.
 */

import type { WbReportingAccess } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function fetchWbReportingAccess(signal?: AbortSignal): Promise<WbReportingAccess> {
  const response = await fetch(`${API_BASE_URL}/api/wbreporting/my-access/`, {
    headers: {
      Authorization: `Token ${localStorage.getItem('wb.authToken')}`,
      'Content-Type': 'application/json',
    },
    signal,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      typeof body?.detail === 'string' ? body.detail : `Request failed: ${response.status}`
    );
  }
  return (await response.json()) as WbReportingAccess;
}
