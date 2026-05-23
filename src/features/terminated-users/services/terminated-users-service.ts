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
  email: string;
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
}

export async function fetchTerminatedUsers(): Promise<TerminatedUser[]> {
  const response = await fetch(`${API_BASE_URL}/api/accounts/users/terminated/`, {
    headers: getAuthHeaders(),
  });

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
  if (Array.isArray(data)) return data;
  return data.results ?? [];
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
