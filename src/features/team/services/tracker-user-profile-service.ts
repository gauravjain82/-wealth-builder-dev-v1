import type { MissionTrackerRecord } from '@/features/team/mission-tracker/services/mission-tracker-service';
import type { AssociateTrackerRecord } from '@/features/team/associate-tracker/services/associate-tracker-service';
import type { LicensingTrackerRecord } from '@/features/team/licensing-tracker/services/licensing-tracker-service';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const MISSION_TRACKER_API_KEY = ['4', 'X4'].join('');

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
  is_active?: boolean;
  roles?: string[] | null;
  status?: string | null;
  registration_status?: string | null;
  avatar_url?: string | null;
  level?: { id?: number | null; code?: string | null; name?: string | null } | string | null;
  profile?: {
    birthday?: string | null;
    photo_url?: string | null;
    photo_url_thumb?: string | null;
    state?: string;
    home_address?: string;
    home_address2?: string;
    home_city?: string;
    home_zip?: string;
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
    home_address?: string;
    home_address2?: string;
    home_city?: string;
    home_zip?: string;
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
  missionTracker: MissionTrackerRecord | null;
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

function getMultipartAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Token ${token}`,
  };
}

function normalizeTrackerUserProfile(user: TrackerUserProfile): TrackerUserProfile {
  const profileAvatar = user.profile?.photo_url_thumb || user.profile?.photo_url || null;
  return {
    ...user,
    avatar_url: user.avatar_url || profileAvatar,
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

async function fetchOptionalTrackerJson<T>(url: string): Promise<T | null> {
  try {
    return await fetchOptionalJson<T>(url);
  } catch {
    return null;
  }
}

export async function fetchTrackerUserProfile(userId: number): Promise<TrackerUserProfile> {
  const response = await fetch(`${API_BASE_URL}/api/accounts/users/${userId}/`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user profile: ${response.statusText}`);
  }

  const raw = (await response.json()) as TrackerUserProfile;
  return normalizeTrackerUserProfile(raw);
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

  const raw = (await response.json()) as TrackerUserProfile;
  return normalizeTrackerUserProfile(raw);
}

export async function uploadTrackerUserPhoto(
  userId: number,
  photo: File
): Promise<TrackerUserProfile> {
  const formData = new FormData();
  formData.append('photo', photo);

  const response = await fetch(`${API_BASE_URL}/api/accounts/users/${userId}/upload-photo/`, {
    method: 'POST',
    headers: getMultipartAuthHeaders(),
    body: formData,
  });

  if (!response.ok) {
    let message = `Failed to upload profile photo: ${response.statusText}`;
    try {
      const data = await response.json();
      message = data?.detail || data?.photo || data?.message || message;
    } catch {
      // Keep fallback message.
    }
    throw new Error(message);
  }

  const raw = (await response.json()) as TrackerUserProfile;
  return normalizeTrackerUserProfile(raw);
}

export async function terminateTrackerUser(userId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/accounts/users/${userId}/terminate/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    let message = `Failed to terminate user: ${response.statusText}`;
    try {
      const data = await response.json();
      message = data?.detail || data?.message || message;
    } catch {
      // Keep fallback message.
    }
    throw new Error(message);
  }
}

export async function fetchTrackerProfileSnapshots(userId: number): Promise<TrackerProfileSnapshots> {
  const [missionTracker, associate, licensing] = await Promise.all([
    fetchOptionalTrackerJson<MissionTrackerRecord>(`${API_BASE_URL}/api/tracker/trackers/${MISSION_TRACKER_API_KEY}/${userId}/`),
    fetchOptionalTrackerJson<AssociateTrackerRecord>(`${API_BASE_URL}/api/tracker/trackers/associate/${userId}/`),
    fetchOptionalTrackerJson<LicensingTrackerRecord>(`${API_BASE_URL}/api/tracker/trackers/licensing/${userId}/`),
  ]);

  return { missionTracker, associate, licensing };
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
