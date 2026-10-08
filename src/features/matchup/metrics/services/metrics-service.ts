/**
 * API client for the read-only Match Up metrics (`/api/matchup/metrics/*`).
 */

import type {
  MetricsAccess,
  MetricsQuery,
  MetricsReport,
  MetricsTrend,
  ProspectJourney,
  TrendQuery,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  return { Authorization: `Token ${token}`, 'Content-Type': 'application/json' };
}

function queryString(query?: MetricsQuery): string {
  if (!query) return '';
  const params = new URLSearchParams({ start: query.start, end: query.end, mode: query.mode });
  if (query.segment) params.set('segment', query.segment);
  return `?${params.toString()}`;
}

async function getJson<T>(path: string, query?: MetricsQuery, signal?: AbortSignal): Promise<T> {
  return readJson<T>(await fetch(`${API_BASE_URL}${path}${queryString(query)}`, { headers: authHeaders(), signal }));
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail || `Metrics request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

function trendQueryString(query: TrendQuery): string {
  const params = new URLSearchParams({ end: query.end, mode: query.mode, weeks: String(query.weeks) });
  if (query.segment) params.set('segment', query.segment);
  return `?${params.toString()}`;
}

/**
 * Weekly trend for one drill level. A 404 resolves to null — the trend
 * endpoint deploys separately from this page, and until it exists the page
 * simply draws no sparklines. Any other failure throws as usual.
 */
async function getTrend(path: string, query: TrendQuery, signal?: AbortSignal): Promise<MetricsTrend | null> {
  const response = await fetch(`${API_BASE_URL}${path}${trendQueryString(query)}`, { headers: authHeaders(), signal });
  if (response.status === 404) return null;
  return readJson<MetricsTrend>(response);
}

export const matchupMetricsService = {
  /** Whether the viewer may open the page, and which team scopes they get. */
  access: (signal?: AbortSignal) => getJson<MetricsAccess>('/api/matchup/metrics/my-access/', undefined, signal),

  organisation: (query: MetricsQuery, signal?: AbortSignal) =>
    getJson<MetricsReport>('/api/matchup/metrics/organisation/', query, signal),

  /** `smdId` null = agents with no SMD above them. */
  smd: (smdId: number | null, query: MetricsQuery, signal?: AbortSignal) =>
    getJson<MetricsReport>(`/api/matchup/metrics/smd/${smdId ?? 'none'}/`, query, signal),

  agent: (agentId: number, query: MetricsQuery, signal?: AbortSignal) =>
    getJson<MetricsReport>(`/api/matchup/metrics/agent/${agentId}/`, query, signal),

  prospect: (prospectId: number, query: MetricsQuery, signal?: AbortSignal) =>
    getJson<ProspectJourney>(`/api/matchup/metrics/prospect/${prospectId}/`, query, signal),

  trendOrganisation: (query: TrendQuery, signal?: AbortSignal) =>
    getTrend('/api/matchup/metrics/trend/organisation/', query, signal),

  /** `smdId` null = agents with no SMD above them. */
  trendSmd: (smdId: number | null, query: TrendQuery, signal?: AbortSignal) =>
    getTrend(`/api/matchup/metrics/trend/smd/${smdId ?? 'none'}/`, query, signal),

  trendAgent: (agentId: number, query: TrendQuery, signal?: AbortSignal) =>
    getTrend(`/api/matchup/metrics/trend/agent/${agentId}/`, query, signal),
};
