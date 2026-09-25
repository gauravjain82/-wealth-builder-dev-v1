/**
 * API client for the WB Contests surfaces.
 *
 * Every endpoint is gated server-side by `homev2:read`; hiding a control here is not
 * authorization. Requests take an `AbortSignal`, so a filter change cancels work
 * already in flight — `UI_CONTRACT.md` requires stale responses to be discarded, and
 * React Query only does that reliably when the fetch is abortable.
 *
 * Shaped after `leaderboards-service.ts` rather than diverging from it: same auth
 * header, same `{code, detail}` error handling, same guarded JSON parse for the case
 * where a proxy returns HTML.
 */

import type {
  ContestAccess,
  ContestErrorCode,
  ContestSummary,
  FlyerResponse,
  ProfileResponse,
  ProofResponse,
  StandingsQuery,
  StandingsResponse,
  ThresholdMetric,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const BASE = '/api/wbreporting';

/** An API failure carrying the backend's stable error code, when it sent one. */
export class ContestError extends Error {
  readonly code?: ContestErrorCode;
  readonly status: number;

  constructor(message: string, status: number, code?: ContestErrorCode) {
    super(message);
    this.name = 'ContestError';
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
 * Turn a non-2xx response into a `ContestError`.
 *
 * The backend answers 4xx with `{code, detail}`. A gateway or proxy might still
 * produce HTML, so the JSON parse is guarded rather than assumed.
 */
async function describeFailure(response: Response): Promise<ContestError> {
  try {
    const body = await response.json();
    return new ContestError(
      typeof body?.detail === 'string' ? body.detail : `Request failed: ${response.status}`,
      response.status,
      body?.code
    );
  } catch {
    return new ContestError(`Request failed: ${response.status}`, response.status);
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

/** Capability flags driving the route guard and the menu entry. */
export function fetchContestAccess(signal?: AbortSignal): Promise<ContestAccess> {
  return getJson<ContestAccess>('/my-access/', new URLSearchParams(), signal);
}

/** Readable contests for the card's selector, active ones first. */
export async function fetchContests(signal?: AbortSignal): Promise<ContestSummary[]> {
  const body = await getJson<{ results: ContestSummary[] }>(
    '/contest-board/',
    new URLSearchParams(),
    signal
  );
  return body.results;
}

/** Query parameters for one standings request. */
export function standingsParams(query: StandingsQuery): URLSearchParams {
  const params = new URLSearchParams({
    scope: query.scope,
    net: String(query.net),
    leaders: String(query.leaders),
    agents: String(query.agents),
    direction: query.direction,
  });
  if (query.personId !== null && query.scope !== 'all') {
    params.set('person', String(query.personId));
  }
  if (query.tierIds.length) params.set('tiers', query.tierIds.join(','));
  if (query.sortTier !== null) params.set('sort_tier', String(query.sortTier));
  if (query.cursor) params.set('cursor', query.cursor);
  return params;
}

/**
 * One prepared page of standings.
 *
 * The response contains evaluations, not result rows: Django does the aggregation,
 * the eligibility, the ordering and the pagination.
 */
export function fetchStandings(
  query: StandingsQuery,
  signal?: AbortSignal
): Promise<StandingsResponse> {
  return getJson<StandingsResponse>(
    `/contest-board/${query.contestId}/standings/`,
    standingsParams(query),
    signal
  );
}

/**
 * The rows behind one number.
 *
 * No dates are sent. The server resolves the period from the tier — a
 * browser-supplied window is not authoritative, and a client that could choose one
 * could show a number the standings cell never claimed.
 */
export function fetchProof(
  input: {
    contestId: number;
    tierId: number;
    agentId: number;
    metric: ThresholdMetric;
    cursor?: string;
  },
  signal?: AbortSignal
): Promise<ProofResponse> {
  const params = new URLSearchParams({
    agent_id: String(input.agentId),
    tier_id: String(input.tierId),
    metric: input.metric,
  });
  if (input.cursor) params.set('cursor', input.cursor);
  return getJson<ProofResponse>(`/contest-board/${input.contestId}/proof/`, params, signal);
}

/** The privacy-approved agent profile and its cycle-safe paths. */
export function fetchAgentProfile(
  input: { contestId: number; agentId: number },
  signal?: AbortSignal
): Promise<ProfileResponse> {
  return getJson<ProfileResponse>(
    `/contest-board/${input.contestId}/agents/${input.agentId}/`,
    new URLSearchParams(),
    signal
  );
}

/** A short-lived storage URL for the flyer, when visibility policy permits. */
export function fetchFlyer(contestId: number, signal?: AbortSignal): Promise<FlyerResponse> {
  return getJson<FlyerResponse>(
    `/contest-board/${contestId}/flyer/`,
    new URLSearchParams(),
    signal
  );
}
