const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface AssociateTrackerRecord {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  latest_note_text?: string | null;
  latest_note_tracker?: string | null;
  latest_note_created_at?: string | null;
  latest_note_created_by_name?: string | null;
  recruiter_name?: string | null;
  leader_name?: string | null;
  agency_code?: string | null;
  invited_at?: string | null;
  avatar_url?: string | null;
  finish_1st_recruit: boolean;
  finish_1st_savings: boolean;
  savings_1st_amount: number | string | null;
  big_event_1st: boolean;
  observe_4_recruits: boolean;
  observe_4_clients: boolean;
  is_licensed: boolean;
  direct_registration_1st: boolean;
  recruit_9: number;
  personal_points_45k: number;
  registration_base_15k: number;
  net_license_amount: number | string;
  is_net_licensed: boolean;
  is_key_player: boolean;
  is_training: boolean;
  big_event_2nd: boolean;
  is_big_event_2nd_reset: boolean;
  created_at: string;
  updated_at: string;
}

interface PaginatedTrackerResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AssociateTrackerQuery {
  page?: number;
  pageSize?: number;
  sort?: string;
  filters?: Record<string, string>;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function fetchAssociates(
  query: AssociateTrackerQuery = {}
): Promise<PaginatedTrackerResponse<AssociateTrackerRecord>> {
  const params = new URLSearchParams();
  params.set('page', String(query.page ?? 1));
  params.set('page_size', String(query.pageSize ?? 10));
  if (query.sort) {
    params.set('sort', query.sort);
  }

  if (query.filters) {
    Object.entries(query.filters).forEach(([key, value]) => {
      const normalized = value?.trim();
      if (!normalized) return;
      params.set(key, normalized);
    });
  }

  const response = await fetch(`${API_BASE_URL}/api/tracker/trackers/associate/?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error(`Failed to fetch associates: ${response.statusText}`);

  const data = (await response.json()) as
    | PaginatedTrackerResponse<AssociateTrackerRecord>
    | AssociateTrackerRecord[];

  if (Array.isArray(data)) {
    return {
      count: data.length,
      next: null,
      previous: null,
      results: data,
    };
  }

  return data;
}

export async function updateAssociateTracker(
  userId: number,
  payload: Partial<AssociateTrackerRecord>
): Promise<AssociateTrackerRecord> {
  const response = await fetch(`${API_BASE_URL}/api/tracker/trackers/associate/${userId}/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to update associate tracker: ${response.statusText}`);
  }

  return (await response.json()) as AssociateTrackerRecord;
}

async function postAssociateReset(path: string, errorMessage: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`${errorMessage}: ${response.statusText}`);
  }
}

export async function resetAssociateBigEvent(): Promise<void> {
  await postAssociateReset(
    '/api/tracker/trackers/associate/reset-big-event/',
    'Failed to reset associate big event'
  );
}

export async function resetAssociateTraining(): Promise<void> {
  await postAssociateReset(
    '/api/tracker/trackers/associate/reset-training/',
    'Failed to reset associate training'
  );
}
