/**
 * BuilderAI API client. Talks to the Django `builderai` app which serves
 * pre-materialized aggregates, so responses are fast and date ranges are just a
 * sum of month rows on the backend.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export type BuilderSegment = 'company' | 'baseshop';
export type BuilderMetricKey = 'recruits' | 'points' | 'licenses' | 'registrations';

export interface BuilderMetricCard {
  key: BuilderMetricKey;
  label: string;
  current: number | string;
  goal: number | string;
  pct: number;
}

export interface BuilderMemberMetric {
  current: number | string;
  goal: number | string;
  pct: number;
}

export interface BuilderMemberRow {
  user_id: number;
  name: string | null;
  agency_code: string | null;
  level: string | null;
  is_built: boolean;
  metrics: Record<BuilderMetricKey, BuilderMemberMetric>;
}

export interface BuilderScopePayload {
  segment: BuilderSegment;
  builder_count: number;
  cards: BuilderMetricCard[];
  members?: BuilderMemberRow[];
}

export interface BuilderHomePayload {
  organization: {
    company_owners: number;
    total_builders: number;
    baseshop_builders: number;
  };
  builders_built: { company: number; baseshop: number };
  sizes: { company_size: number; baseshop_size: number };
  reporting: BuilderScopePayload;
}

export interface BuilderMyAccess {
  can_view: boolean;
  can_manage_config: boolean;
  can_add_builders: boolean;
  is_owner: boolean;
}

export interface BuilderConfig {
  monthly_recruits_target: number;
  monthly_points_target: string;
  monthly_licenses_target: number;
  monthly_registrations_target: number;
  yearly_recruits_target: number;
  yearly_points_target: string;
  yearly_licenses_target: number;
  yearly_registrations_target: number;
  baseshop_builder_cap: number;
  owner_min_level: number | null;
  owner_min_level_code: string | null;
  enabled: boolean;
}

/** Date range passed to the dashboards; maps to backend start/end query params. */
export interface BuilderRange {
  startDate?: string;
  endDate?: string;
}

export interface BuilderReportingPoint {
  year: number;
  month: number;
  /** ISO date (YYYY-MM-DD) for daily series; absent on legacy monthly rows. */
  date?: string;
  label: string;
  recruits: number;
  points: number | string;
  licenses: number;
  registrations: number;
}

export interface BuilderReportingPayload {
  segment: BuilderSegment;
  builder_count: number;
  metrics: { key: BuilderMetricKey; label: string }[];
  series: BuilderReportingPoint[];
}

export interface BuilderBulletinRow {
  rank: number;
  user_id: number;
  name: string | null;
  agency_code: string | null;
  level: string | null;
  value: number | string;
  is_built: boolean;
}

export interface BuilderBulletinPayload {
  segment: BuilderSegment;
  metric: BuilderMetricKey;
  total_builders: number;
  podium: BuilderBulletinRow[];
  rows: BuilderBulletinRow[];
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

function buildQuery(range?: BuilderRange, extra?: Record<string, string>): string {
  const params = new URLSearchParams();
  if (range?.startDate && range?.endDate) {
    params.set('start', range.startDate);
    params.set('end', range.endDate);
  }
  Object.entries(extra || {}).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`BuilderAI request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export function fetchBuilderHome(
  segment: BuilderSegment,
  range?: BuilderRange
): Promise<BuilderHomePayload> {
  return getJson(`/api/builderai/home/${buildQuery(range, { segment })}`);
}

export function fetchBuilderCompany(range?: BuilderRange): Promise<BuilderScopePayload> {
  return getJson(`/api/builderai/company/${buildQuery(range)}`);
}

export function fetchBuilderBaseshop(range?: BuilderRange): Promise<BuilderScopePayload> {
  return getJson(`/api/builderai/baseshop/${buildQuery(range)}`);
}

export function fetchBuilderRoster(
  segment: BuilderSegment,
  range?: BuilderRange
): Promise<{ segment: BuilderSegment; members: BuilderMemberRow[] }> {
  return getJson(`/api/builderai/roster/${buildQuery(range, { segment })}`);
}

export function fetchBuilderReporting(
  segment: BuilderSegment,
  range?: BuilderRange
): Promise<BuilderReportingPayload> {
  return getJson(`/api/builderai/reporting/${buildQuery(range, { segment })}`);
}

export function fetchBuilderBulletin(
  segment: BuilderSegment,
  metric: BuilderMetricKey,
  search: string,
  range?: BuilderRange
): Promise<BuilderBulletinPayload> {
  return getJson(
    `/api/builderai/bulletin/${buildQuery(range, { segment, metric, search })}`
  );
}

export function fetchBuilderMyAccess(): Promise<BuilderMyAccess> {
  return getJson('/api/builderai/my-access/');
}

export function fetchBuilderConfig(): Promise<BuilderConfig> {
  return getJson('/api/builderai/config/');
}
