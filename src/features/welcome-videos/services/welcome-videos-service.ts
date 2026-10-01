/**
 * API client for the welcome-video library.
 *
 * Any authenticated user may read it; there is no capability gate. The request takes
 * an `AbortSignal` so React Query can cancel it on unmount.
 */

import type { WelcomeVideosResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function fetchWelcomeVideos(signal?: AbortSignal): Promise<WelcomeVideosResponse> {
  const response = await fetch(`${API_BASE_URL}/api/notifications/onboarding-drip/videos/`, {
    headers: getAuthHeaders(),
    signal,
  });
  if (!response.ok) throw new Error(`Failed to load welcome videos: ${response.status}`);
  return (await response.json()) as WelcomeVideosResponse;
}
