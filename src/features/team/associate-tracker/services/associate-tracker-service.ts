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

interface PaginatedUsersResponse<T> {
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

export interface HotRecruitUser {
  id: number;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  client?: boolean;
  leader_name?: string | null;
  recruited_by_name?: string | null;
  type?: string | null;
  user_type?: string | null;
  plan?: string | null;
  latest_note_text?: string | null;
  latest_note_created_by_name?: string | null;
  latest_note_created_at?: string | null;
  agency_code?: string | null;
  level?: {
    id?: number;
    code?: string;
    rank?: number;
    name?: string;
    description?: string;
  } | null;
  profile?: {
    birthday?: string | null;
  } | null;
  agent_meta?: {
    outcome?: string | null;
  } | null;
  prospect_meta?: {
    hot?: boolean;
    top25?: boolean;
  } | null;
  created_at?: string;
}

export interface AssociateUserListFilters {
  hot?: boolean;
  client?: boolean;
  licensed?: boolean;
  top25?: boolean;
  sort?: string;
  pageSize?: number;
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

function resolveNextUrl(nextUrl: string): string {
  if (nextUrl.startsWith('http://') || nextUrl.startsWith('https://')) {
    return nextUrl;
  }
  return `${API_BASE_URL}${nextUrl}`;
}

export async function fetchAssociateUsersForAssociate(
  recruiterUserId: number,
  filters: AssociateUserListFilters = {}
): Promise<HotRecruitUser[]> {
  const params = new URLSearchParams();
  params.set('recruited_by', String(recruiterUserId));
  if (filters.hot !== undefined) params.set('hot', String(filters.hot));
  if (filters.client !== undefined) params.set('client', String(filters.client));
  if (filters.licensed !== undefined) params.set('is_license', String(filters.licensed));
  if (filters.top25 !== undefined) params.set('top25', String(filters.top25));
  params.set('page_size', String(filters.pageSize ?? 200));
  params.set('sort', filters.sort || '-created_at');

  let nextUrl: string | null = `${API_BASE_URL}/api/accounts/users/?${params.toString()}`;
  const collected: HotRecruitUser[] = [];
  let pageSafety = 0;

  while (nextUrl && pageSafety < 10) {
    const response = await fetch(nextUrl, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch hot recruits: ${response.statusText}`);
    }

    const data = (await response.json()) as PaginatedUsersResponse<HotRecruitUser> | HotRecruitUser[];

    if (Array.isArray(data)) {
      collected.push(...data);
      break;
    }

    collected.push(...(data.results || []));
    nextUrl = data.next ? resolveNextUrl(data.next) : null;
    pageSafety += 1;
  }

  return collected;
}

export async function fetchHotRecruitsForAssociate(recruiterUserId: number): Promise<HotRecruitUser[]> {
  return fetchAssociateUsersForAssociate(recruiterUserId, { hot: true });
}

export async function fetchClientUsersForAssociate(recruiterUserId: number): Promise<HotRecruitUser[]> {
  return fetchAssociateUsersForAssociate(recruiterUserId, { client: true });
}

export async function fetchLicensedUsersForAssociate(recruiterUserId: number): Promise<HotRecruitUser[]> {
  return fetchAssociateUsersForAssociate(recruiterUserId, { licensed: true });
}
