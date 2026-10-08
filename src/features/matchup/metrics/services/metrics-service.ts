/**
 * API client for the read-only Match Up metrics (`/api/matchup/metrics/*`).
 */

import type { MetricsAccess, MetricsQuery, MetricsReport, ProspectJourney } from '../types';

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
  const response = await fetch(`${API_BASE_URL}${path}${queryString(query)}`, {
    headers: authHeaders(),
    signal,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail || `Metrics request failed (${response.status})`);
  }
  return (await response.json()) as T;
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
};
