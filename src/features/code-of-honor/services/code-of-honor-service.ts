/**
 * API client for the Code of Honor wall (`/api/code-of-honor/`).
 *
 * Shaped after `contests-service.ts`: same token header, guarded JSON parse, and every
 * read takes an `AbortSignal` so a newer search or poll cancels the stale one. The
 * backend answers failures with `{"error": {code, message, detail}}`; `CohError` keeps
 * the stable `code` (the UI switches on it) and the `detail` (tied acts on a 409).
 *
 * Hiding a control is not authorization: every endpoint is checked server-side.
 */

import type {
  AdminSettings,
  AdminSettingsResponse,
  AdminValue,
  AuditEvent,
  CompleteResponse,
  LeaderboardResponse,
  MemberOption,
  MyAccess,
  PreviewResponse,
  ResultsResponse,
  ReviewAct,
  ReviewAction,
  ReviewResponse,
  SubmitPayload,
  VoteFeed,
  WallResponse,
  WallState,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const BASE = `${API_BASE_URL}/api/code-of-honor`;

/** An API failure with the backend's stable error code and structured detail. */
export class CohError extends Error {
  readonly code?: string;
  readonly status: number;
  readonly detail: Record<string, unknown>;

  constructor(message: string, status: number, code?: string, detail: Record<string, unknown> = {}) {
    super(message);
    this.name = 'CohError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

function headers(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  return { Authorization: `Token ${token}`, 'Content-Type': 'application/json' };
}

/** Turn a non-2xx response into a `CohError` (a proxy may still answer with HTML). */
async function failure(response: Response): Promise<CohError> {
  try {
    const body = await response.json();
    const error = body?.error;
    if (error && typeof error.message === 'string') {
      return new CohError(error.message, response.status, error.code, error.detail ?? {});
    }
    return new CohError(
      typeof body?.detail === 'string' ? body.detail : `Request failed: ${response.status}`,
      response.status
    );
  } catch {
    return new CohError(`Request failed: ${response.status}`, response.status);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}/${path}`, { ...init, headers: headers() });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new CohError('Network problem — check your connection and try again.', 0, 'network');
  }
  if (!response.ok) throw await failure(response);
  return (await response.json()) as T;
}

const get = <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: 'GET', signal });
const post = <T>(path: string, body: unknown = {}) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const fetchMyAccess = (signal?: AbortSignal) => get<MyAccess>('my-access/', signal);
export const fetchState = (signal?: AbortSignal) => get<WallState>('state/', signal);
export const fetchWall = (signal?: AbortSignal) => get<WallResponse>('wall/', signal);
export const searchMembers = (query: string, signal?: AbortSignal) =>
  get<{ members: MemberOption[] }>(`members/?q=${encodeURIComponent(query)}`, signal);
export const previewAct = (nomineeId: string, text: string) =>
  post<PreviewResponse>('acts/preview/', { nominee_id: nomineeId, text });
export const submitAct = (payload: SubmitPayload) => post<{ ok: true; slots_left: number }>('acts/', payload);

export const fetchVote = (signal?: AbortSignal) => get<VoteFeed>('vote/', signal);
export const setLike = (actId: string, liked: boolean) => post<VoteFeed>(`vote/${actId}/like/`, { liked });

export const fetchResults = (cycle: string | null, signal?: AbortSignal) =>
  get<ResultsResponse>(cycle ? `results/?cycle=${encodeURIComponent(cycle)}` : 'results/', signal);
export const fetchLeaderboard = (year: number | null, signal?: AbortSignal) =>
  get<LeaderboardResponse>(year ? `leaderboard/?year=${year}` : 'leaderboard/', signal);

export const fetchReview = (cycle: string | null, signal?: AbortSignal) =>
  get<ReviewResponse>(cycle ? `review/?cycle=${encodeURIComponent(cycle)}` : 'review/', signal);
export const reviewAct = (actId: string, action: ReviewAction) =>
  post<{ ok: true; act: ReviewAct }>(`review/acts/${actId}/`, action);
export const fetchAudit = (cycle: string, signal?: AbortSignal) =>
  get<{ events: AuditEvent[] }>(`review/audit/?cycle=${encodeURIComponent(cycle)}`, signal);
export const openVoting = (cycleId: string) => post<{ ok: true }>(`cycles/${cycleId}/open-voting/`);
export const startRunoff = (cycleId: string) => post<{ ok: true }>(`cycles/${cycleId}/runoff/`);
export const completeCycle = (cycleId: string) => post<CompleteResponse>(`cycles/${cycleId}/complete/`);
export const recordTieDecision = (cycleId: string, actIds: string[], reason: string) =>
  post<CompleteResponse>(`cycles/${cycleId}/tie-decision/`, { act_ids: actIds, reason });

export const fetchAdminSettings = (signal?: AbortSignal) => get<AdminSettingsResponse>('admin/settings/', signal);
export const saveAdminSettings = (changes: Partial<AdminSettings>) =>
  request<AdminSettingsResponse>('admin/settings/', { method: 'PATCH', body: JSON.stringify(changes) });
export const fetchAdminValues = (signal?: AbortSignal) => get<{ values: AdminValue[] }>('admin/values/', signal);
export const saveAdminValue = (value: Partial<AdminValue> & { key: string }) =>
  post<{ ok: true; value: AdminValue; values: AdminValue[] }>('admin/values/', value);
