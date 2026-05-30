const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface LicensingTrackerRecord {
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
  is_agent_agreement_done: boolean;
  agent_approval_date: string | null;
  is_licensed: boolean;
  is_continuing_education_done: boolean;
  is_direct_deposit_done: boolean;
  is_eop_platform_done: boolean;
  is_fingerprint_done: boolean;
  is_launch_direct_done: boolean;
  is_license_cert_done: boolean;
  sircon_nipr_date: string | null;
  test_result: boolean;
  test_date: string | null;
  test_result_date: string | null;
  is_xcel: boolean;
  created_at: string;
  updated_at: string;
}

interface PaginatedTrackerResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface LicensingTrackerQuery {
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

export async function fetchLicensingTracker(
  query: LicensingTrackerQuery = {}
): Promise<PaginatedTrackerResponse<LicensingTrackerRecord>> {
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

  const response = await fetch(`${API_BASE_URL}/api/tracker/trackers/licensing/?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch licensing tracker: ${response.statusText}`);
  }

  const data = (await response.json()) as
    | PaginatedTrackerResponse<LicensingTrackerRecord>
    | LicensingTrackerRecord[];

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

export async function updateLicensingTracker(
  userId: number,
  payload: Partial<LicensingTrackerRecord>
): Promise<LicensingTrackerRecord> {
  const response = await fetch(`${API_BASE_URL}/api/tracker/trackers/licensing/${userId}/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to update licensing tracker: ${response.statusText}`);
  }

  return (await response.json()) as LicensingTrackerRecord;
}
