const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export type HomeLeaderboardMetric = 'recruits' | 'points' | 'licenses' | 'big_event';
export type HomeLeaderboardLevel = 'SMD' | 'MD';

export interface HomeLeaderboardEntry {
  user_id: number;
  user_name: string;
  email: string;
  agency_code: string | null;
  level_id: number | null;
  level_code: HomeLeaderboardLevel;
  level_name: string | null;
  metric: HomeLeaderboardMetric;
  value: number | string;
  base_team_count: number;
  rank: number;
  photo_thumb_url?: string | null;
}

export interface HomeLeaderboard {
  smd: HomeLeaderboardEntry[];
  md: HomeLeaderboardEntry[];
}

export interface HomePerformanceStats {
  current_month_personal_recruits: number;
  current_month_team_recruits: number;
  current_month_personal_points: number | string;
  current_month_team_points: number | string;
  current_month_licenses: number;
  net_license_amount: number | string;
  current_month_net_licensed_count: number;
  total_licenses: number;
  total_big_event_registrations: number;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

async function fetchLeaderboardLevel(
  level: HomeLeaderboardLevel,
  metric: HomeLeaderboardMetric
): Promise<HomeLeaderboardEntry[]> {
  const params = new URLSearchParams({ level, metric, limit: '5', months: '1', global: 'true' });
  const response = await fetch(
    `${API_BASE_URL}/api/tracker/policies/top_base_team_leaders/?${params.toString()}`,
    { headers: getAuthHeaders() }
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Unable to load ${level} leaderboard`);
  }
  return (await response.json()) as HomeLeaderboardEntry[];
}

export async function fetchHomeLeaderboard(
  metric: HomeLeaderboardMetric
): Promise<HomeLeaderboard> {
  const [smd, md] = await Promise.all([
    fetchLeaderboardLevel('SMD', metric),
    fetchLeaderboardLevel('MD', metric),
  ]);
  return { smd, md };
}

export async function fetchHomePerformanceStats(
  userId: string
): Promise<HomePerformanceStats> {
  const response = await fetch(
    `${API_BASE_URL}/api/tracker/trackers/associate/${userId}/`,
    { headers: getAuthHeaders() }
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Unable to load performance stats');
  }
  return (await response.json()) as HomePerformanceStats;
}
