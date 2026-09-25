/**
 * API client for the WB reporting pipeline. Talks to the Django `wbreporting`
 * app, whose every endpoint is gated server-side by `wbreporting:read` or
 * `wbreporting:manage`.
 */

import type {
  CapabilityReport,
  EnqueuedJob,
  PipelineAccess,
  PipelineJobName,
  PipelineRunStatus,
  PipelineRunsResponse,
  PipelineStatus,
  RebuildMonthlyRequest,
  RecalculateDailyRequest,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const BASE = '/api/wbreporting';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

/** Pull the backend's error text out of a DRF response so the UI can show it. */
async function describeFailure(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.detail === 'string') return body.detail;
    const firstField = Object.entries(body).find(([, value]) => Array.isArray(value));
    if (firstField) return `${firstField[0]}: ${(firstField[1] as string[]).join(' ')}`;
    return JSON.stringify(body);
  } catch {
    return `Request failed: ${response.status}`;
  }
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${BASE}${path}`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error(await describeFailure(response));
  return (await response.json()) as T;
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${BASE}${path}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await describeFailure(response));
  return (await response.json()) as T;
}

/** Capability flags driving the menu entry and route guard. */
export function fetchPipelineAccess(): Promise<PipelineAccess> {
  return getJson('/my-access/');
}

export function fetchPipelineStatus(): Promise<PipelineStatus> {
  return getJson('/pipeline/status/');
}

/** Recent run history, newest first. `job` and `status` are validated server-side. */
export function fetchPipelineRuns(params: {
  job?: PipelineJobName | '';
  status?: PipelineRunStatus | '';
  limit?: number;
}): Promise<PipelineRunsResponse> {
  const query = new URLSearchParams();
  if (params.job) query.set('job', params.job);
  if (params.status) query.set('status', params.status);
  query.set('limit', String(params.limit ?? 25));
  return getJson(`/pipeline/runs/?${query.toString()}`);
}

/** Runs the source-contract check inline; writes nothing. */
export function runCapabilityCheck(): Promise<CapabilityReport> {
  return postJson('/pipeline/check/');
}

export function recalculateDaily(request: RecalculateDailyRequest): Promise<EnqueuedJob> {
  return postJson('/pipeline/recalculate-daily/', request);
}

export function rebuildMonthly(request: RebuildMonthlyRequest): Promise<EnqueuedJob> {
  return postJson('/pipeline/rebuild-monthly/', request);
}
