const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface AssociateTrackerRecord {
  id: number;
  serial_no?: number;
  user_id: number;
  user_name: string;
  user_email: string;
  latest_note_text?: string | null;
  latest_note_tracker?: string | null;
  latest_note_created_at?: string | null;
  latest_note_created_by_name?: string | null;
  recruiter_name?: string | null;
  recruiter_id?: number | null;
  leader_name?: string | null;
  leader_id?: number | null;
  agency_code?: string | null;
  ama_date?: string | null;
  invited_at?: string | null;
  avatar_url?: string | null;
  photo_thumb_url?: string | null;
  registration_status?: string | null;
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
  why: string;
  goal: string;
  big_event_2nd: boolean;
  is_big_event_2nd_reset: boolean;
  created_at: string;
  updated_at: string;

  // API fields for input boxes
  current_month_team_recruits?: number | null;
  current_month_personal_recruits?: number | null;
  last_3_month_team_recruits?: number | null;
  last_3_month_personal_recruits?: number | null;
  current_month_team_points?: number | null;
  current_month_personal_points?: number | null;
  last_3_month_team_points?: number | null;
  last_3_month_personal_points?: number | null;
  pending_personal_points?: number | null;
  pending_team_points?: number | null;
  current_month_licenses?: number | null;
  total_licenses?: number | null;
  current_month_big_event_registrations?: number | null;
  total_big_event_registrations?: number | null;
}

interface PaginatedTrackerResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface PaginatedUsersResponse<T> {
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
  isProspect?: string | number;
  sort?: string;
  page?: number;
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

export async function fetchAssociateTracker(userId: number): Promise<AssociateTrackerRecord> {
  const response = await fetch(`${API_BASE_URL}/api/tracker/trackers/associate/${userId}/`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch associate tracker: ${response.statusText}`);
  }

  return (await response.json()) as AssociateTrackerRecord;
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

export async function fetchAssociateUsersForAssociate(
  recruiterUserId: number,
  filters: AssociateUserListFilters = {}
): Promise<HotRecruitUser[]> {
  const collected: HotRecruitUser[] = [];
  let page = 1;
  let hasMore = true;
  let pageSafety = 0;

  while (hasMore && pageSafety < 10) {
    const data = await fetchAssociateUsersForAssociatePage(recruiterUserId, {
      ...filters,
      page,
      pageSize: filters.pageSize ?? 200,
    });
    collected.push(...data.results);
    hasMore = Boolean(data.next);
    page += 1;
    pageSafety += 1;
  }

  return collected;
}

export async function fetchAssociateUsersForAssociatePage(
  recruiterUserId: number,
  filters: AssociateUserListFilters = {}
): Promise<PaginatedUsersResponse<HotRecruitUser>> {
  const params = new URLSearchParams();
  // params.set('recruited_by', String(recruiterUserId));
  if (filters.hot !== undefined) params.set('hot', String(filters.hot));
  if (filters.client !== undefined) params.set('client', String(filters.client));
  if (filters.licensed !== undefined) params.set('is_license', String(filters.licensed));
  if (filters.top25 !== undefined) params.set('top25', String(filters.top25));
  if (filters.isProspect !== undefined) params.set('isProspect', String(filters.isProspect));
  params.set('page', String(filters.page ?? 1));
  params.set('page_size', String(filters.pageSize ?? 20));
  params.set('sort', filters.sort || '-created_at');
  params.set('recruiter_downline', String(recruiterUserId));

  const response = await fetch(`${API_BASE_URL}/api/accounts/users/?${params.toString()}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch associate users: ${response.statusText}`);
  }

  const data = (await response.json()) as PaginatedUsersResponse<HotRecruitUser> | HotRecruitUser[];

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

export async function fetchHotRecruitsForAssociate(recruiterUserId: number): Promise<HotRecruitUser[]> {
  return fetchAssociateUsersForAssociate(recruiterUserId, { hot: true, isProspect: 1 });
}

export async function fetchClientUsersForAssociate(recruiterUserId: number): Promise<HotRecruitUser[]> {
  return fetchAssociateUsersForAssociate(recruiterUserId, { client: true });
}

export async function fetchLicensedUsersForAssociate(recruiterUserId: number): Promise<HotRecruitUser[]> {
  return fetchAssociateUsersForAssociate(recruiterUserId, { licensed: true });
}
