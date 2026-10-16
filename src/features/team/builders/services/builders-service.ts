import { deviceLocalTime, deviceTimeZone } from '../daily-six-dates';
import { BUILDER_PROGRAM, type TeamProgram } from '../team-programs';

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
  /** IANA zone the submitting device reported; `submission_date` is that zone's day. */
  client_timezone: string;
  /** Device wall-clock time of the latest save, ISO 8601 with offset. */
  client_local_time: string;
  /** Server UTC time of the first save. */
  created_at: string;
  /** Server UTC time of the latest save. */
  server_received_at: string;
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
  /**
   * `YYYY-MM-DD` of an already-submitted day to correct. Omitted means today.
   * The backend refuses a day outside its edit window or one with no submission.
   */
  submission_date?: string;
}

/** Distinct days submitted on. Two sessions on one day count once. */
export interface DailySixStats {
  days_this_month: number;
  total_days: number;
}

/** The submitter's local "today" (as the backend computed it) and the oldest day it still accepts an edit for. */
export interface DailySixEditWindow {
  today: string;
  /** IANA zone `today` was computed in; empty when the backend fell back to its own date. */
  timezone?: string;
  edit_window_days: number;
  editable_from: string;
}

export interface DailySixResponse extends Partial<DailySixEditWindow> {
  submission: DailySixSubmission;
  streak: number;
  stats?: DailySixStats;
}

export interface AgencyDailySixContext extends Partial<DailySixEditWindow> {
  user_name: string;
  agency_code: string;
  pace: BuilderPace;
  streak: number;
  today_submissions: DailySixSubmission[];
  stats?: DailySixStats;
  /** Sessions that failed to save and were recreated empty; the user still has to fill them in. */
  needs_reentry?: DailySixSubmission[];
}

export interface DailySixHistoryMonth extends DailySixEditWindow {
  /** `YYYY-MM` */
  month: string;
  submissions: DailySixSubmission[];
  /** Every submission still inside the edit window, newest day first — not limited to `month`. */
  editable_submissions: DailySixSubmission[];
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

/** The viewer's own program flags, from their associate tracker row. */
export interface TeamProgramMembership {
  is_builder: boolean;
  is_producer: boolean;
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

export async function fetchTeamProgramMembership(signal?: AbortSignal): Promise<TeamProgramMembership> {
  const response = await fetch(`${API_BASE_URL}/api/tracker/builders/membership/`, {
    headers: getAuthHeaders(),
    signal,
  });
  if (!response.ok) throw await parseError(response, 'Failed to fetch program membership');
  return (await response.json()) as TeamProgramMembership;
}

export async function fetchResultsLeaderboard(
  program: TeamProgram = BUILDER_PROGRAM
): Promise<ResultsLeaderboardEntry[]> {
  const response = await fetch(`${API_BASE_URL}/api/tracker/${program.leaderboardSegment}/leaderboard/results/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw await parseError(response, 'Failed to fetch results leaderboard');
  return asList<ResultsLeaderboardEntry>(await response.json());
}

export async function fetchActivityLeaderboard(
  paceId: number,
  program: TeamProgram = BUILDER_PROGRAM
): Promise<ActivityLeaderboardEntry[]> {
  const params = new URLSearchParams({ pace: String(paceId) });
  const response = await fetch(
    `${API_BASE_URL}/api/tracker/${program.leaderboardSegment}/leaderboard/activity/?${params.toString()}`,
    { headers: getAuthHeaders() }
  );
  if (!response.ok) throw await parseError(response, 'Failed to fetch activity leaderboard');
  return asList<ActivityLeaderboardEntry>(await response.json());
}

/** `?tz=` so the backend reads "today" on the device's calendar. */
function timeZoneQuery(extra: Record<string, string> = {}): string {
  const params = new URLSearchParams(extra);
  const tz = deviceTimeZone();
  if (tz) params.set('tz', tz);
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** The payload plus the device's zone and wall-clock time, which the backend stores with the submission. */
function withDeviceClock(payload: DailySixPayload): DailySixPayload & {
  client_timezone: string;
  client_local_time: string;
} {
  return { ...payload, client_timezone: deviceTimeZone(), client_local_time: deviceLocalTime() };
}

export async function fetchTodayDailySix(): Promise<DailySixSubmission[]> {
  const response = await fetch(`${API_BASE_URL}/api/tracker/builders/daily-six/${timeZoneQuery()}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw await parseError(response, "Failed to fetch today's Daily Six");
  return asList<DailySixSubmission>(await response.json());
}

export async function submitDailySix(payload: DailySixPayload): Promise<DailySixResponse> {
  const response = await fetch(`${API_BASE_URL}/api/tracker/builders/daily-six/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(withDeviceClock(payload)),
  });
  if (!response.ok) throw await parseError(response, 'Failed to submit Daily Six');
  return (await response.json()) as DailySixResponse;
}

export async function fetchAgencyDailySix(agencyCode: string): Promise<AgencyDailySixContext> {
  const response = await fetch(
    `${API_BASE_URL}/api/tracker/builders/daily-six/${encodeURIComponent(agencyCode)}/${timeZoneQuery()}`
  );
  if (!response.ok) throw await parseError(response, 'Failed to fetch Daily Six link');
  return (await response.json()) as AgencyDailySixContext;
}

export async function submitAgencyDailySix(agencyCode: string, payload: DailySixPayload): Promise<DailySixResponse> {
  const response = await fetch(`${API_BASE_URL}/api/tracker/builders/daily-six/${encodeURIComponent(agencyCode)}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDeviceClock(payload)),
  });
  if (!response.ok) throw await parseError(response, 'Failed to submit Daily Six');
  return (await response.json()) as DailySixResponse;
}

export async function fetchAgencyDailySixHistory(
  agencyCode: string,
  month: string,
  signal?: AbortSignal
): Promise<DailySixHistoryMonth> {
  const response = await fetch(
    `${API_BASE_URL}/api/tracker/builders/daily-six/${encodeURIComponent(agencyCode)}/history/${timeZoneQuery({ month })}`,
    { signal }
  );
  if (!response.ok) throw await parseError(response, 'Failed to fetch Daily Six history');
  return (await response.json()) as DailySixHistoryMonth;
}
