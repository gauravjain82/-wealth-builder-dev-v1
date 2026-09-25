/**
 * API client for the WB Leaderboards surfaces.
 *
 * Every endpoint is gated server-side by `homev2:read`; hiding a control here is not
 * authorization. Requests take an `AbortSignal` so a filter change can cancel work
 * that is already in flight — `UI_CONTRACT.md` requires stale responses to be
 * discarded, and React Query only does that reliably if the fetch is abortable.
 */

import type {
  DetailResponse,
  FullReportResponse,
  LeaderboardAccess,
  LeaderboardCardResponse,
  LeaderboardErrorCode,
  LeaderboardResponse,
  LeaderboardSelection,
  Scope,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const BASE = '/api/wbreporting';

/** An API failure carrying the backend's stable error code, when it sent one. */
export class LeaderboardError extends Error {
  readonly code?: LeaderboardErrorCode;
  readonly status: number;

  constructor(message: string, status: number, code?: LeaderboardErrorCode) {
    super(message);
    this.name = 'LeaderboardError';
    this.status = status;
    this.code = code;
  }
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Turn a non-2xx response into a `LeaderboardError`.
 *
 * The backend answers 4xx with `{code, detail}`. A gateway or proxy might still
 * produce HTML, so the JSON parse is guarded rather than assumed.
 */
async function describeFailure(response: Response): Promise<LeaderboardError> {
  try {
    const body = await response.json();
    return new LeaderboardError(
      typeof body?.detail === 'string' ? body.detail : `Request failed: ${response.status}`,
      response.status,
      body?.code
    );
  } catch {
    return new LeaderboardError(`Request failed: ${response.status}`, response.status);
  }
}

async function getJson<T>(path: string, params: URLSearchParams, signal?: AbortSignal): Promise<T> {
  const query = params.toString();
  const response = await fetch(`${API_BASE_URL}${BASE}${path}${query ? `?${query}` : ''}`, {
    headers: getAuthHeaders(),
    signal,
  });
  if (!response.ok) throw await describeFailure(response);
  return (await response.json()) as T;
}

/**
 * Selection as query parameters.
 *
 * Explicit `start`/`end` win over the named range, matching the backend: a custom
 * range is only applied once the user presses Apply, at which point the caller sets
 * both dates.
 */
export function selectionParams(selection: LeaderboardSelection): URLSearchParams {
  const params = new URLSearchParams({ metric: selection.metric, scope: selection.scope });
  if (selection.start && selection.end) {
    params.set('start', selection.start);
    params.set('end', selection.end);
  } else {
    params.set('range', selection.rangeKey);
  }
  return params;
}

/** Capability flags driving the route guard and the menu entry. */
export function fetchLeaderboardAccess(signal?: AbortSignal): Promise<LeaderboardAccess> {
  return getJson<LeaderboardAccess>('/my-access/', new URLSearchParams(), signal);
}

/** The compact card payload: one metric, a short preview, no proof rows. */
export function fetchLeaderboardCard(
  selection: LeaderboardSelection,
  signal?: AbortSignal
): Promise<LeaderboardCardResponse> {
  return getJson<LeaderboardCardResponse>('/leaderboards/card/', selectionParams(selection), signal);
}

/** The expanded leaderboard: both Top-5 panels plus the viewer's own summary. */
export function fetchLeaderboard(
  selection: LeaderboardSelection,
  signal?: AbortSignal
): Promise<LeaderboardResponse> {
  return getJson<LeaderboardResponse>('/leaderboards/', selectionParams(selection), signal);
}

/** The Full Report for the current month-to-date, or a specific `YYYY-MM`. */
export function fetchFullReport(
  input: { month?: string; scope: Scope },
  signal?: AbortSignal
): Promise<FullReportResponse> {
  const params = new URLSearchParams({ scope: input.scope });
  if (input.month) params.set('month', input.month);
  return getJson<FullReportResponse>('/leaderboards/full/', params, signal);
}

/** One page of the proof rows behind a number, already masked for this viewer. */
export function fetchLeaderboardDetail(
  input: LeaderboardSelection & { agentId: string; detailMetric: string; cursor?: string },
  signal?: AbortSignal
): Promise<DetailResponse> {
  const params = selectionParams(input);
  params.set('agent_id', input.agentId);
  params.set('metric', input.detailMetric);
  if (input.cursor) params.set('cursor', input.cursor);
  return getJson<DetailResponse>('/leaderboards/detail/', params, signal);
}
