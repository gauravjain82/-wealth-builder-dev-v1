const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ProspectMeta {
  notes: string;
  hot: boolean;
  top25: boolean;
  outcome: string;
  mark: string;
  files: any[];
  source_date: string | null;
}

export interface UserProfile {
  birthday: string | null;
  city: string;
  state: string;
  phone: string;
  gender: string;
  occupation: string;
  how_known: string;
  what_told: string;
  relationship?: number | null;
  dependent_children?: boolean;
  flags?: Record<string, boolean>;
}

export interface Prospect {
  id: number;
  username: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  full_name: string;
  status: string;
  agency_code: string;
  parent_name: string;
  recruited_by_name: string;
  leader_name: string;
  recruited_by: number | null;
  parent: number | null;
  leader: number | null;
  roles: string[];
  prospect_meta: ProspectMeta | null;
  profile: UserProfile | null;
  created_at: string;
  updated_at: string;
}

export interface ProspectsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Prospect[];
}

export interface ProspectQueryParams {
  page?: number;
  pageSize?: number;
  ordering?: string;
  search?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  leaderName?: string;
  recruiterName?: string;
}

function appendIfPresent(params: URLSearchParams, key: string, value?: string | number) {
  if (value === undefined || value === null) return;
  const normalized = String(value).trim();
  if (!normalized) return;
  params.set(key, normalized);
}

function resolveNextUrl(nextUrl: string): string {
  if (nextUrl.startsWith('http://') || nextUrl.startsWith('https://')) {
    return nextUrl;
  }
  return `${API_BASE_URL}${nextUrl}`;
}

export async function fetchProspects(query: ProspectQueryParams = {}): Promise<ProspectsResponse> {
  const token = localStorage.getItem('wb.authToken');
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const params = new URLSearchParams();
  appendIfPresent(params, 'page', query.page);
  appendIfPresent(params, 'page_size', query.pageSize);
  appendIfPresent(params, 'ordering', query.ordering);
  appendIfPresent(params, 'search', query.search);

  // Field filters aligned with backend django-filter keys.
  appendIfPresent(params, 'full_name__icontains', query.fullName);
  appendIfPresent(params, 'email__icontains', query.email);
  appendIfPresent(params, 'phone__icontains', query.phone);
  appendIfPresent(params, 'leader__full_name__icontains', query.leaderName);
  appendIfPresent(params, 'recruited_by__full_name__icontains', query.recruiterName);

  const queryString = params.toString();
  const url = `${API_BASE_URL}/api/accounts/users/${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch prospects: ${response.statusText}`);
  }

  const data = await response.json();

  // Support both paginated and plain-array responses.
  if (Array.isArray(data)) {
    return {
      count: data.length,
      next: null,
      previous: null,
      results: data as Prospect[],
    };
  }

  return data as ProspectsResponse;
}

export async function fetchUsersForSelection(): Promise<Prospect[]> {
  const headers = getAuthHeaders();
  const users: Prospect[] = [];
  let nextUrl: string | null = `${API_BASE_URL}/api/accounts/users/?page_size=200`;
  let pageSafety = 0;

  while (nextUrl && pageSafety < 10) {
    const response = await fetch(nextUrl, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.statusText}`);
    }

    const data: ProspectsResponse = await response.json();
    users.push(...data.results);
    nextUrl = data.next ? resolveNextUrl(data.next) : null;
    pageSafety += 1;
  }

  return users;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  return {
    'Authorization': `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function saveProspectCallLog(
  prospect: Prospect,
  outcome: string,
  note: string
): Promise<Prospect> {
  const existingNotes = prospect.prospect_meta?.notes || '';
  const time = new Date().toLocaleString();
  const line = `[${time}] ${outcome}${note ? ` - ${note}` : ''}`;
  const mergedNotes = existingNotes ? `${line}\n${existingNotes}` : line;
  const response = await fetch(`${API_BASE_URL}/api/accounts/users/${prospect.id}/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      prospect_meta: {
        notes: mergedNotes,
        hot: prospect.prospect_meta?.hot ?? false,
        top25: prospect.prospect_meta?.top25 ?? false,
        outcome,
        mark: prospect.prospect_meta?.mark || '',
        files: prospect.prospect_meta?.files || [],
        source_date: prospect.prospect_meta?.source_date ?? null,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save call log: ${response.statusText}`);
  }

  return (await response.json()) as Prospect;
}

export async function activateProspectWithAgencyCode(
  prospectId: number,
  agencyCode: string
): Promise<Prospect> {
  const response = await fetch(`${API_BASE_URL}/api/accounts/users/${prospectId}/activate/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      agency_code: agencyCode,
      status: 'ACTIVE',
    }),
  });

  if (!response.ok) {
    let message = `Failed to add agency code: ${response.statusText}`;
    try {
      const data = await response.json();
      message = data?.detail || data?.agency_code?.[0] || data?.message || message;
    } catch {
      // Keep fallback message.
    }
    throw new Error(message);
  }

  return (await response.json()) as Prospect;
}

interface UpdateProspectPayload {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  email?: string;
  ama_date?: string;
  polo_size?: string;
  spouse_name?: string;
  spouse_phone?: string;
  spouse_polo_size?: string;
  recruited_by?: number | null;
  leader?: number | null;
  profile?: {
    state?: string;
    birthday?: string;
    gender?: string;
    occupation?: string;
    how_known?: string;
    what_told?: string;
    relationship?: number | null;
    dependent_children?: boolean;
    flags?: Record<string, boolean>;
  };
  prospect_meta?: {
    notes?: string;
    hot?: boolean;
    top25?: boolean;
    outcome?: string;
    mark?: string;
    files?: any[];
    source_date?: string | null;
  };
}

export async function updateProspectDetails(
  prospectId: number,
  payload: UpdateProspectPayload
): Promise<Prospect> {
  const response = await fetch(`${API_BASE_URL}/api/accounts/users/${prospectId}/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = `Failed to update prospect: ${response.statusText}`;
    try {
      const data = await response.json();
      message = data?.detail || data?.message || message;
    } catch {
      // Keep fallback message.
    }
    throw new Error(message);
  }

  return (await response.json()) as Prospect;
}

export async function deleteProspect(prospectId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/accounts/users/${prospectId}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (response.ok || response.status === 204) {
    return;
  }

  let message = `Failed to delete prospect: ${response.statusText}`;
  try {
    const data = await response.json();
    message = data?.detail || data?.message || message;
  } catch {
    // Keep fallback message.
  }
  throw new Error(message);
}

export interface CreateProspectPayload {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  recruited_by?: number | null;
  leader?: number | null;
  parent?: number | null;
  plan?: string;
  profile?: {
    state?: string;
    birthday?: string;
    gender?: string;
    occupation?: string;
    how_known?: string;
    what_told?: string;
    relationship?: number | null;
    dependent_children?: boolean;
    flags?: Record<string, boolean>;
  };
  prospect_meta?: {
    notes?: string;
    hot?: boolean;
    top25?: boolean;
    outcome?: string;
    mark?: string;
    files?: any[];
    source_date?: string | null;
  };
}

function buildProspectUsername(payload: CreateProspectPayload) {
  const fullName = `${payload.first_name} ${payload.last_name}`.trim().toLowerCase();
  const baseFromName = fullName
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '.');
  const baseFromEmail = (payload.email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
  const base = baseFromEmail || baseFromName || 'prospect';
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return `${base}.${suffix}`;
}

export async function createProspect(payload: CreateProspectPayload): Promise<Prospect> {
  const firstName = payload.first_name.trim();
  const lastName = payload.last_name.trim();
  const email = payload.email?.trim() || null;
  const phone = payload.phone?.trim() || '';

  if (!firstName || !lastName) {
    throw new Error('First name and last name are required.');
  }

  if (!email && !phone) {
    throw new Error('Email or phone is required.');
  }

  const response = await fetch(`${API_BASE_URL}/api/accounts/users/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      username: buildProspectUsername(payload),
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      recruited_by: payload.recruited_by ?? null,
      leader: payload.leader ?? null,
      parent: payload.parent ?? payload.recruited_by ?? null,
      plan: payload.plan || 'New Agent',
      profile: payload.profile || {},
      prospect_meta: {
        notes: payload.prospect_meta?.notes || '',
        hot: payload.prospect_meta?.hot ?? false,
        top25: payload.prospect_meta?.top25 ?? false,
        outcome: payload.prospect_meta?.outcome || 'Both',
        mark: payload.prospect_meta?.mark || 'default',
        files: payload.prospect_meta?.files || [],
        source_date: payload.prospect_meta?.source_date ?? null,
      },
    }),
  });

  if (!response.ok) {
    let message = `Failed to create prospect: ${response.statusText}`;
    try {
      const data = await response.json();
      const fieldError = Object.values(data || {}).find((value) => Array.isArray(value)) as
        | string[]
        | undefined;
      message = data?.detail || fieldError?.[0] || data?.message || message;
    } catch {
      // Keep fallback message.
    }
    throw new Error(message);
  }

  return (await response.json()) as Prospect;
}
