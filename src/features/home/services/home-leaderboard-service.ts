const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface HomePerformanceStats {
  current_month_personal_recruits: number;
  current_month_team_recruits: number;
  current_month_personal_points: number | string;
  current_month_team_points: number | string;
  current_month_licenses: number;
  net_license_amount: number | string;
  current_month_net_licensed_count: number;
  total_licenses: number;
  total_butts_in_seat: number;
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

function getSegmentHierarchy(segment: string): string[] {
  switch (segment) {
    case 'SUPERTEAM':
      return ['SUPERTEAM', 'SUPERBASE', 'BASESHOP'];
    case 'SUPERBASE':
      return ['SUPERBASE', 'BASESHOP'];
    case 'BASESHOP':
      return ['BASESHOP'];
    default:
      return [];
  }
}

export async function fetchHomePerformanceStats(
  userId: string,
  segment?: string,
  year?: number,
  month?: number
): Promise<HomePerformanceStats> {
  const base = `${API_BASE_URL}/api/tracker/trackers/associate/${userId}/`;
  const params = new URLSearchParams();
  if (segment) {
    params.set('segment', getSegmentHierarchy(segment).join(','));
  }
  if (typeof year === 'number') params.set('year', String(year));
  if (typeof month === 'number') params.set('month', String(month));
  const url = params.toString() ? `${base}?${params.toString()}` : base;
  const response = await fetch(url, { headers: getAuthHeaders() });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Unable to load performance stats');
  }
  return (await response.json()) as HomePerformanceStats;
}
