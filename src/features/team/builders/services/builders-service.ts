const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface BuilderPace {
  id: number;
  name: string;
  target_friends: number;
  target_calls: number;
  target_appointments: number;
  is_public: boolean;
}

export interface BuilderEnrollment {
  id: number;
  user_name: string;
  pace: BuilderPace;
  enrolled_at: string;
  is_active: boolean;
  submission_link: string | null;
}

export interface DailySixSubmission {
  id: number;
  submission_date: string;
  session: 'AM' | 'PM';
  friends_made: number;
  calls_made: number;
  appointments: number;
  preplan: boolean;
  business_plan_am: boolean;
  business_plan_pm: boolean;
  pages_read: boolean;
  created_at: string;
}

export interface DailySixPayload {
  session: 'AM' | 'PM';
  friends_made: number;
  calls_made: number;
  appointments: number;
  preplan: boolean;
  business_plan_am: boolean;
  business_plan_pm: boolean;
  pages_read: boolean;
}

export interface DailySixResponse {
  submission: DailySixSubmission;
  streak: number;
}

export interface AgencyDailySixContext {
  user_name: string;
  agency_code: string;
  pace: BuilderPace;
  streak: number;
  today_submissions: DailySixSubmission[];
}

export interface ResultsLeaderboardEntry {
  rank: number;
  user_id: number;
  name: string;
  leader: string | null;
  recruits: number;
  points: string;
  licenses: number;
  registrations: number;
  score: number;
}

export interface ActivityLeaderboardEntry {
  rank: number;
  user_id: number;
  name: string;
  friends_pct: number;
  calls_pct: number;
  appts_pct: number;
  streak: number;
  activity_score: number;
}

interface ListResponse<T> {
  results?: T[];
  data?: T[];
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseError(response: Response, fallback: string): Promise<Error> {
  try {
    const body = await response.json();
    if (body?.detail) return new Error(String(body.detail));
  } catch {
    // Keep the fallback below.
  }
  return new Error(`${fallback}: ${response.statusText}`);
}

function asList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];

  if (value && typeof value === 'object') {
    const response = value as ListResponse<T>;
    if (Array.isArray(response.results)) return response.results;
    if (Array.isArray(response.data)) return response.data;
  }

  return [];
}

export async function fetchBuilderPaces(): Promise<BuilderPace[]> {
  const response = await fetch(`${API_BASE_URL}/api/tracker/builders/paces/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw await parseError(response, 'Failed to fetch builder paces');
  return asList<BuilderPace>(await response.json());
}

export async function fetchBuilderEnrollment(): Promise<BuilderEnrollment | null> {
  const response = await fetch(`${API_BASE_URL}/api/tracker/builders/enrollment/`, {
    headers: getAuthHeaders(),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw await parseError(response, 'Failed to fetch builder enrollment');
  return (await response.json()) as BuilderEnrollment;
}

export async function updateBuilderEnrollment(payload: {
  user_id?: number;
  pace_id?: number;
  is_custom?: boolean;
  name?: string;
  target_friends?: number;
  target_calls?: number;
  target_appointments?: number;
}): Promise<BuilderEnrollment> {
  const response = await fetch(`${API_BASE_URL}/api/tracker/builders/enrollment/`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await parseError(response, 'Failed to update builder enrollment');
  return (await response.json()) as BuilderEnrollment;
}

export async function fetchResultsLeaderboard(): Promise<ResultsLeaderboardEntry[]> {
  const response = await fetch(`${API_BASE_URL}/api/tracker/builders/leaderboard/results/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw await parseError(response, 'Failed to fetch results leaderboard');
  return asList<ResultsLeaderboardEntry>(await response.json());
}

export async function fetchActivityLeaderboard(paceId: number): Promise<ActivityLeaderboardEntry[]> {
  const params = new URLSearchParams({ pace: String(paceId) });
  const response = await fetch(`${API_BASE_URL}/api/tracker/builders/leaderboard/activity/?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw await parseError(response, 'Failed to fetch activity leaderboard');
  return asList<ActivityLeaderboardEntry>(await response.json());
}

export async function fetchTodayDailySix(): Promise<DailySixSubmission[]> {
  const response = await fetch(`${API_BASE_URL}/api/tracker/builders/daily-six/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw await parseError(response, "Failed to fetch today's Daily Six");
  return asList<DailySixSubmission>(await response.json());
}

export async function submitDailySix(payload: DailySixPayload): Promise<DailySixResponse> {
  const response = await fetch(`${API_BASE_URL}/api/tracker/builders/daily-six/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await parseError(response, 'Failed to submit Daily Six');
  return (await response.json()) as DailySixResponse;
}

export async function fetchAgencyDailySix(agencyCode: string): Promise<AgencyDailySixContext> {
  const response = await fetch(`${API_BASE_URL}/api/tracker/builders/daily-six/${encodeURIComponent(agencyCode)}/`);
  if (!response.ok) throw await parseError(response, 'Failed to fetch Daily Six link');
  return (await response.json()) as AgencyDailySixContext;
}

export async function submitAgencyDailySix(agencyCode: string, payload: DailySixPayload): Promise<DailySixResponse> {
  const response = await fetch(`${API_BASE_URL}/api/tracker/builders/daily-six/${encodeURIComponent(agencyCode)}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await parseError(response, 'Failed to submit Daily Six');
  return (await response.json()) as DailySixResponse;
}
