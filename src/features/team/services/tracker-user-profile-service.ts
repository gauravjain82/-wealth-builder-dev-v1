import type { Tracker4x4Record } from '@/features/team/tracker-4x4/services/tracker-4x4-service';
import type { AssociateTrackerRecord } from '@/features/team/associate-tracker/services/associate-tracker-service';
import type { LicensingTrackerRecord } from '@/features/team/licensing-tracker/services/licensing-tracker-service';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface TrackerUserProfile {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  agency_code?: string | null;
  ama_date?: string | null;
  polo_size?: string | null;
  spouse_name?: string | null;
  spouse_phone?: string | null;
  spouse_polo_size?: string | null;
  recruited_by?: number | null;
  leader?: number | null;
  recruited_by_name?: string | null;
  leader_name?: string | null;
  plan?: string | null;
  roles?: string[] | null;
  status?: string | null;
  avatar_url?: string | null;
  level?: { id?: number | null; code?: string | null; name?: string | null } | string | null;
  profile?: {
    birthday?: string | null;
    state?: string;
    gender?: string;
    occupation?: string;
    how_known?: string;
    what_told?: string;
    relationship?: number | null;
    dependent_children?: boolean;
    flags?: Record<string, boolean>;
  } | null;
}

export interface TrackerUserProfileUpdatePayload {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  agency_code?: string;
  ama_date?: string | null;
  polo_size?: string;
  spouse_name?: string;
  spouse_phone?: string;
  spouse_polo_size?: string;
  recruited_by?: number | null;
  leader?: number | null;
  level_id?: number | null;
  profile?: {
    birthday?: string;
    state?: string;
    gender?: string;
    occupation?: string;
    how_known?: string;
    what_told?: string;
    relationship?: number | null;
    dependent_children?: boolean;
    flags?: Record<string, boolean>;
  };
}

export interface TrackerProfileSnapshots {
  tracker4x4: Tracker4x4Record | null;
  associate: AssociateTrackerRecord | null;
  licensing: LicensingTrackerRecord | null;
}

interface AccountsUsersListResponse {
  results?: TrackerUserProfile[];
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

async function fetchOptionalJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, { headers: getAuthHeaders() });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Failed to load profile details: ${response.statusText}`);
  }
  return (await response.json()) as T;
}

export async function fetchTrackerUserProfile(userId: number): Promise<TrackerUserProfile> {
  const response = await fetch(`${API_BASE_URL}/api/accounts/users/${userId}/`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user profile: ${response.statusText}`);
  }

  return (await response.json()) as TrackerUserProfile;
}

export async function updateTrackerUserProfile(
  userId: number,
  payload: TrackerUserProfileUpdatePayload
): Promise<TrackerUserProfile> {
  const response = await fetch(`${API_BASE_URL}/api/accounts/users/${userId}/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = `Failed to update user profile: ${response.statusText}`;
    try {
      const data = await response.json();
      message = data?.detail || data?.message || message;
    } catch {
      // Keep fallback message.
    }
    throw new Error(message);
  }

  return (await response.json()) as TrackerUserProfile;
}

export async function fetchTrackerProfileSnapshots(userId: number): Promise<TrackerProfileSnapshots> {
  const [tracker4x4, associate, licensing] = await Promise.all([
    fetchOptionalJson<Tracker4x4Record>(`${API_BASE_URL}/api/tracker/trackers/4X4/${userId}/`),
    fetchOptionalJson<AssociateTrackerRecord>(`${API_BASE_URL}/api/tracker/trackers/associate/${userId}/`),
    fetchOptionalJson<LicensingTrackerRecord>(`${API_BASE_URL}/api/tracker/trackers/licensing/${userId}/`),
  ]);

  return { tracker4x4, associate, licensing };
}

export async function resolveTrackerUserIdByName(name: string): Promise<number | null> {
  const query = name.trim();
  if (!query) return null;

  const params = new URLSearchParams();
  params.set('search', query);
  params.set('page_size', '25');

  const response = await fetch(`${API_BASE_URL}/api/accounts/users/?${params.toString()}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as AccountsUsersListResponse | TrackerUserProfile[];
  const results = Array.isArray(payload) ? payload : payload.results || [];
  if (!results.length) return null;

  const normalized = query.toLowerCase();
  const exactMatch = results.find((item) => {
    const full = (item.full_name || `${item.first_name || ''} ${item.last_name || ''}`).trim().toLowerCase();
    return full === normalized;
  });

  if (exactMatch?.id) return exactMatch.id;
  return results[0]?.id ?? null;
}

export async function resolveRelatedTrackerUserId(
  sourceUserId: number,
  relation: 'recruiter' | 'leader'
): Promise<number | null> {
  const profile = await fetchTrackerUserProfile(sourceUserId);
  return relation === 'recruiter' ? profile.recruited_by ?? null : profile.leader ?? null;
}
