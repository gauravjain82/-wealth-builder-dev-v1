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

export async function fetchProspects(): Promise<Prospect[]> {
  const token = localStorage.getItem('wb.authToken');
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}/api/accounts/users/`, {
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch prospects: ${response.statusText}`);
  }

  const data: ProspectsResponse = await response.json();
  return data.results;
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
    nextUrl = data.next;
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
