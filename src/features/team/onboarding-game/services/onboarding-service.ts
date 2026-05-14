const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

export interface OnboardingTrackerData {
  userId: number;
  userName: string;
  userEmail: string;
  // Module completion flags (mapped from AssociateTracker)
  introWatched: boolean;       // m0 — m_videos_watched
  multiHanded: boolean;        // m1 — milestone_multi_handed
  tenThreeGoals: boolean;      // m2 — ten_thre_results_goals
  selfImprovement: boolean;    // m3 — self_improvement
  observe4Recruits: boolean;   // m4 — milestone_observe_4_recruits
  observe4Clients: boolean;    // m5 — milestone_observe_4_clients
  getLicense: boolean;         // m6 — get_license
  registrationConvention: boolean; // m7 — registration_convention
  // Rolling 3 months numeric fields
  recruitTtl: number;          // m8 — recruit_ttl (need >= 9)
  personalPoints: number;      // m9 — personal_points (need >= 45000)
  licensesInTtl: number;       // m10 — licenses_in_ttl (need >= 3)
  registrationsBase: number;   // m11 — no backend field (always 0)
}

interface RawAssociateRecord {
  id: number;
  user_id: number;
  user_name?: string | null;
  user_email?: string | null;
  // Legacy keys
  m_videos_watched?: boolean;
  milestone_multi_handed?: boolean;
  ten_thre_results_goals?: boolean;
  self_improvement?: boolean;
  milestone_observe_4_recruits?: boolean;
  milestone_observe_4_clients?: boolean;
  get_license?: boolean;
  registration_convention?: boolean;
  recruit_ttl?: number;
  personal_points?: number;
  licenses_in_ttl?: number;
  registrations_base?: number;
  // New keys after tracker schema rename
  finish_1st_recruit?: boolean;
  finish_1st_savings?: boolean;
  big_event_1st?: boolean;
  observe_4_recruits?: boolean;
  observe_4_clients?: boolean;
  is_licensed?: boolean;
  direct_registration_1st?: boolean;
  recruit_9?: number;
  personal_points_45k?: number;
  registration_base_15k?: number;
  intro_watched?: boolean;
  intro_local?: boolean;
}

function pickBool(...values: Array<boolean | null | undefined>): boolean {
  for (const value of values) {
    if (typeof value === 'boolean') return value;
  }
  return false;
}

function pickNumber(...values: Array<number | null | undefined>): number {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return 0;
}

function mapRecord(r: RawAssociateRecord): OnboardingTrackerData {
  const introWatched = pickBool(
    r.m_videos_watched,
    r.intro_watched,
    r.intro_local,
    // Fallback for schemas where intro flag is no longer persisted separately.
    r.finish_1st_recruit,
  );

  return {
    userId: r.user_id,
    userName: r.user_name ?? '',
    userEmail: r.user_email ?? '',
    introWatched,
    multiHanded: pickBool(r.milestone_multi_handed, r.finish_1st_recruit),
    tenThreeGoals: pickBool(r.ten_thre_results_goals, r.finish_1st_savings),
    selfImprovement: pickBool(r.self_improvement, r.big_event_1st),
    observe4Recruits: pickBool(r.milestone_observe_4_recruits, r.observe_4_recruits),
    observe4Clients: pickBool(r.milestone_observe_4_clients, r.observe_4_clients),
    getLicense: pickBool(r.get_license, r.is_licensed),
    registrationConvention: pickBool(r.registration_convention, r.direct_registration_1st),
    recruitTtl: pickNumber(r.recruit_ttl, r.recruit_9),
    personalPoints: pickNumber(r.personal_points, r.personal_points_45k),
    licensesInTtl: pickNumber(r.licenses_in_ttl, r.registration_base_15k),
    registrationsBase: pickNumber(r.registrations_base, r.registration_base_15k),
  };
}

/**
 * Fetch the associate tracker for a specific user by user_id.
 * Backend detail endpoint creates tracker if missing.
 */
export async function fetchOnboardingData(userId: number): Promise<OnboardingTrackerData> {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/tracker/trackers/associate/${userId}/`, { headers });
  if (!res.ok) throw new Error(`Failed to fetch associate tracker: ${res.statusText}`);
  const record = (await res.json()) as RawAssociateRecord;
  return mapRecord(record);
}

/**
 * Mark the intro video as watched for a user.
 * PATCH /api/tracker/trackers/associate/{userId}/
 */
export async function markIntroWatched(userId: number): Promise<void> {
  const headers = getAuthHeaders();
  const payloads = [
    { m_videos_watched: true },
    { intro_watched: true },
    { intro_local: true },
    // Final compatibility fallback if intro fields were removed in schema.
    { finish_1st_recruit: true },
  ];

  let lastError = '';
  for (const payload of payloads) {
    const res = await fetch(`${API_BASE_URL}/api/tracker/trackers/associate/${userId}/`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });
    if (res.ok) return;
    lastError = await res.text().catch(() => res.statusText);
  }

  throw new Error(`Failed to mark intro watched: ${lastError || 'Unknown error'}`);
}
