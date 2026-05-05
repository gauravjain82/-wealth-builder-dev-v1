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
  leader_name?: string | null;
  agency_code?: string | null;
  invited_at?: string | null;
  avatar_url?: string | null;
  agent_agreement: boolean;
  agent_approval_date: string | null;
  licensed: boolean;
  license_active: boolean;
  application_submitted: boolean;
  attended_class: boolean;
  completed_course: boolean;
  continuing_ed: boolean;
  direct_deposit: boolean;
  eop_platform: boolean;
  fingerprint: boolean;
  launch_direct: boolean;
  license_cert: boolean;
  scheduled_class: boolean;
  scheduled_exam: boolean;
  sircon_nipr_date: string | null;
  started_course: boolean;
  test_result: string;
  test_date: string | null;
  test_result_date: string | null;
  xcel: boolean;
  note_passed_exam: boolean;
  note_practice_exam: boolean;
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
