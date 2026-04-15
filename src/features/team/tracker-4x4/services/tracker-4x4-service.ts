const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface Tracker4x4Record {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  agency_code?: string | null;
  invited_at?: string | null;
  avatar_url?: string | null;
  application: boolean;
  licensed: boolean;
  big_event: boolean;
  event_reg: boolean;
  finish_1st: boolean;
  lic_class: string;
  pass_exam: boolean;
  pass_exam_date: string | null;
  practice_exam: boolean;
  sircon_nipr_date: string | null;
  personal_savings: boolean;
  personal_savings_amount: number | string | null;
  finish_1st_recruit: boolean;
  finish_2nd_recruit: boolean;
  finish_3rd_recruit: boolean;
  finish_2nd_savings: boolean;
  finish_2nd_savings_amount: number | string | null;
  finish_3rd_savings: boolean;
  finish_3rd_savings_amount: number | string | null;
  finish_4th_savings: boolean;
  finish_4th_savings_amount: number | string | null;
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

export async function fetch4x4Tracker(): Promise<Tracker4x4Record[]> {
  const headers = getAuthHeaders();
  const records: Tracker4x4Record[] = [];
  let nextUrl: string | null = `${API_BASE_URL}/api/tracker/trackers/4X4/?page_size=200`;
  let pageSafety = 0;

  while (nextUrl && pageSafety < 20) {
    const response = await fetch(nextUrl, { headers });
    if (!response.ok) throw new Error(`Failed to fetch 4x4 tracker: ${response.statusText}`);

    const data = (await response.json()) as PaginatedTrackerResponse<Tracker4x4Record> | Tracker4x4Record[];
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

export async function update4x4Tracker(
  userId: number,
  payload: Partial<Tracker4x4Record>
): Promise<Tracker4x4Record> {
  const response = await fetch(`${API_BASE_URL}/api/tracker/trackers/4X4/${userId}/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to update 4x4 tracker: ${response.statusText}`);
  }

  return (await response.json()) as Tracker4x4Record;
}
