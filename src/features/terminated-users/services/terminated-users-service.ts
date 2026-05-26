const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

export interface TerminatedUser {
  id: number;
  first_name: string;
  last_name: string;
  full_name?: string | null;
  email: string | null;
  phone?: string | null;
  agency_code?: string | null;
  roles?: string[] | null;
  registration_status?: string | null;
  status?: string | null;
  profile?: {
    photo_url_thumb?: string | null;
    photo_url?: string | null;
  } | null;
}

interface TerminatedUsersResponse {
  results?: TerminatedUser[];
  count?: number;
  next?: string | null;
  previous?: string | null;
}

export interface TerminatedUsersPage {
  results: TerminatedUser[];
  count: number;
  hasMore: boolean;
}

export interface FetchTerminatedUsersOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  signal?: AbortSignal;
}

export async function fetchTerminatedUsers(
  options: FetchTerminatedUsersOptions = {},
): Promise<TerminatedUsersPage> {
  const { page = 1, pageSize = 25, search, signal } = options;
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('page_size', String(pageSize));
  const trimmed = search?.trim();
  if (trimmed) params.set('search', trimmed);

  const response = await fetch(
    `${API_BASE_URL}/api/accounts/users/terminated/?${params.toString()}`,
    {
      headers: getAuthHeaders(),
      signal,
    },
  );

  if (!response.ok) {
    let message = `Failed to fetch terminated users: ${response.statusText}`;
    try {
      const data = await response.json();
      message = data?.detail || data?.message || message;
    } catch {
      // Keep fallback message.
    }
    throw new Error(message);
  }

  const data = (await response.json()) as TerminatedUsersResponse | TerminatedUser[];
  if (Array.isArray(data)) {
    return { results: data, count: data.length, hasMore: false };
  }
  const results = data.results ?? [];
  return {
    results,
    count: data.count ?? results.length,
    hasMore: Boolean(data.next),
  };
}

export async function reactivateUser(userId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/accounts/users/${userId}/reactivate/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    let message = `Failed to reactivate user: ${response.statusText}`;
    try {
      const data = await response.json();
      message = data?.detail || data?.message || message;
    } catch {
      // Keep fallback message.
    }
    throw new Error(message);
  }
}
