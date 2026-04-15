const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface LicensingTrackerRecord {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
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

export async function fetchLicensingTracker(): Promise<LicensingTrackerRecord[]> {
  const headers = getAuthHeaders();
  const records: LicensingTrackerRecord[] = [];
  let nextUrl: string | null = `${API_BASE_URL}/api/tracker/trackers/licensing/?page_size=200`;
  let pageSafety = 0;

  while (nextUrl && pageSafety < 20) {
    const response = await fetch(nextUrl, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch licensing tracker: ${response.statusText}`);
    }

    const data = (await response.json()) as
      | PaginatedTrackerResponse<LicensingTrackerRecord>
      | LicensingTrackerRecord[];

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
