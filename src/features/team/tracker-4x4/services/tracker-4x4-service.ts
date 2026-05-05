const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface Tracker4x4Record {
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

export interface Tracker4x4Query {
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

export async function fetch4x4Tracker(
  query: Tracker4x4Query = {}
): Promise<PaginatedTrackerResponse<Tracker4x4Record>> {
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

  const response = await fetch(`${API_BASE_URL}/api/tracker/trackers/4X4/?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error(`Failed to fetch 4x4 tracker: ${response.statusText}`);

  const data = (await response.json()) as PaginatedTrackerResponse<Tracker4x4Record> | Tracker4x4Record[];
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
