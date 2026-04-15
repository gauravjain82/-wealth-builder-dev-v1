const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface AssociateTrackerRecord {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  agency_code?: string | null;
  invited_at?: string | null;
  avatar_url?: string | null;
  big_event: boolean;
  big_event_reg: boolean;
  finish_first_recruit: boolean;
  get_license: boolean;
  is_event_reset: boolean;
  personal_points: number;
  personal_savings: number | string;
  recruit_ttl: number;
  licenses_in_ttl: number;
  net_license_amount: number | string;
  registration_convention: boolean;
  self_improvement: boolean;
  ten_thre_results_goals: boolean;
  milestone_get_licensed: boolean;
  milestone_observe_4_clients: boolean;
  milestone_observe_4_recruits: boolean;
  milestone_multi_handed: boolean;
  savings_second_done: boolean;
  savings_third_done: boolean;
  savings_fourth_done: boolean;
  key_player: boolean;
  training: boolean;
  created_at: string;
  updated_at: string;
}

interface PaginatedTrackerResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

function resolveNextUrl(nextUrl: string): string {
  if (nextUrl.startsWith('http://') || nextUrl.startsWith('https://')) {
    return nextUrl;
  }
  return `${API_BASE_URL}${nextUrl}`;
}

export async function fetchAssociates(): Promise<AssociateTrackerRecord[]> {
  const headers = getAuthHeaders();
  const records: AssociateTrackerRecord[] = [];
  let nextUrl: string | null = `${API_BASE_URL}/api/tracker/trackers/associate/?page_size=200`;
  let pageSafety = 0;

  while (nextUrl && pageSafety < 20) {
    const response = await fetch(nextUrl, { headers });
    if (!response.ok) throw new Error(`Failed to fetch associates: ${response.statusText}`);

    const data = (await response.json()) as
      | PaginatedTrackerResponse<AssociateTrackerRecord>
      | AssociateTrackerRecord[];

    if (Array.isArray(data)) {
      records.push(...data);
      break;
    }

    records.push(...data.results);
    nextUrl = data.next ? resolveNextUrl(data.next) : null;
    pageSafety += 1;
  }

  return records;
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
