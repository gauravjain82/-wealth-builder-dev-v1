/**
 * API client for the Guidance surfaces.
 *
 * Shaped after `contests-service.ts` rather than diverging from it: same auth header,
 * same `{code, detail}` error handling, same guarded JSON parse for the case where a
 * proxy returns HTML instead of the API.
 *
 * Adapter signals do **not** go through here — they go through `gms-adapter.ts`, whose
 * narrow signature is the privacy boundary (decision G3). Keeping them apart is
 * deliberate: this module has generic request helpers, and a generic helper is exactly
 * what would let a payload reach the signal endpoint one day.
 */

import type {
  CompletionResult,
  GmsAccess,
  GmsErrorCode,
  HelpContext,
  TopicContent,
  LibraryRow,
  WalkthroughDetail,
  WalkthroughProgress,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const BASE = '/api/gms';

/** An API failure carrying the backend's stable error code, when it sent one. */
export class GmsError extends Error {
  readonly code?: GmsErrorCode;
  readonly status: number;
  /** Blocking prerequisites, present on a 409 `prerequisite_failed`. */
  readonly prerequisites?: unknown[];

  constructor(
    message: string,
    status: number,
    code?: GmsErrorCode,
    prerequisites?: unknown[]
  ) {
    super(message);
    this.name = 'GmsError';
    this.status = status;
    this.code = code;
    this.prerequisites = prerequisites;
  }
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  return { Authorization: `Token ${token}`, 'Content-Type': 'application/json' };
}

async function describeFailure(response: Response): Promise<GmsError> {
  try {
    const body = await response.json();
    return new GmsError(
      typeof body?.detail === 'string' ? body.detail : `Request failed: ${response.status}`,
      response.status,
      body?.code,
      body?.prerequisites
    );
  } catch {
    return new GmsError(`Request failed: ${response.status}`, response.status);
  }
}

async function getJson<T>(
  path: string,
  params?: URLSearchParams,
  signal?: AbortSignal
): Promise<T> {
  const query = params?.toString();
  const response = await fetch(`${API_BASE_URL}${BASE}${path}${query ? `?${query}` : ''}`, {
    headers: authHeaders(),
    signal,
  });
  if (!response.ok) throw await describeFailure(response);
  return (await response.json()) as T;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body ?? {}),
  });
  if (!response.ok) throw await describeFailure(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Capability flags driving the Help action, the route guard and the menu entry. */
export function fetchGmsAccess(signal?: AbortSignal): Promise<GmsAccess> {
  return getJson<GmsAccess>('/my-access/', undefined, signal);
}

/** What Help is relevant on the current tool and page. */
export function fetchHelpContext(
  tool: string,
  location?: string,
  signal?: AbortSignal
): Promise<HelpContext> {
  const params = new URLSearchParams({ tool });
  if (location) params.set('location', location);
  return getJson<HelpContext>('/context/', params, signal);
}

/** One topic's published content, with any host-owned notes already resolved. */
export function fetchTopic(
  toolKey: string,
  topicKey: string,
  signal?: AbortSignal
): Promise<TopicContent> {
  return getJson<TopicContent>(`/topics/${toolKey}/${topicKey}/`, undefined, signal);
}

/**
 * The pre-start panel: prerequisites evaluated live, plus progress and XP.
 *
 * `contextIds` carries the sticky host selection the tool already holds — for BPM, the
 * chosen occurrence. Only integer `*_id` values are sent, and the server ignores
 * anything else, so this cannot become a channel for form data.
 */
export function fetchWalkthrough(
  toolKey: string,
  topicKey: string,
  contextIds: Record<string, number> = {},
  signal?: AbortSignal
): Promise<WalkthroughDetail> {
  const params = new URLSearchParams();
  Object.entries(contextIds).forEach(([key, value]) => {
    if (Number.isInteger(value)) params.set(key, String(value));
  });
  return getJson<WalkthroughDetail>(
    `/walkthroughs/${toolKey}/${topicKey}/`,
    params,
    signal
  );
}

/** Validate hard prerequisites and create or resume progress. */
export function startWalkthrough(
  toolKey: string,
  topicKey: string,
  contextIds: Record<string, number> = {},
  isPreview = false
): Promise<WalkthroughProgress> {
  return postJson<WalkthroughProgress>(`/walkthroughs/${toolKey}/${topicKey}/start/`, {
    context_ids: contextIds,
    is_preview: isPreview,
  });
}

/** Abandon the attempt and begin again. Host records are never touched. */
export function restartWalkthrough(
  toolKey: string,
  topicKey: string,
  contextIds: Record<string, number> = {}
): Promise<WalkthroughProgress> {
  return postJson<WalkthroughProgress>(`/walkthroughs/${toolKey}/${topicKey}/restart/`, {
    context_ids: contextIds,
  });
}

/** Record a voluntary exit. */
export function endWalkthrough(
  toolKey: string,
  topicKey: string,
  reason = ''
): Promise<void> {
  return postJson<void>(`/walkthroughs/${toolKey}/${topicKey}/end/`, { reason });
}

/** Confirm the final action succeeded, and collect XP if any is due. */
export function completeWalkthrough(
  toolKey: string,
  topicKey: string,
  signal: string
): Promise<CompletionResult> {
  return postJson<CompletionResult>(`/walkthroughs/${toolKey}/${topicKey}/complete/`, {
    signal,
  });
}

/** Create or update this user's single rating for this walkthrough version. */
export async function saveFeedback(
  toolKey: string,
  topicKey: string,
  rating: number,
  comment: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}${BASE}/walkthroughs/${toolKey}/${topicKey}/feedback/`,
    {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ rating, comment }),
    }
  );
  if (!response.ok) throw await describeFailure(response);
}

/** The content library, or the review queue when a status is given. */
export async function fetchLibrary(
  status?: string,
  signal?: AbortSignal
): Promise<LibraryRow[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const body = await getJson<{ results: LibraryRow[] }>('/manage/topics/', params, signal);
  return body.results;
}

/** Submit, approve or reject one revision. */
export function transitionRevision(
  revisionId: number,
  action: 'submit' | 'approve' | 'reject',
  comment = ''
): Promise<void> {
  return postJson<void>(`/manage/revisions/${revisionId}/${action}/`, { comment });
}

/**
 * Publish a revision over whatever is currently live.
 *
 * `expectedTopicRevision` is required in practice: the backend treats a missing token
 * as a conflict rather than as consent (decision C8's rule, carried into GMS).
 */
export function publishRevision(
  revisionId: number,
  expectedTopicRevision: number,
  publishNote = ''
): Promise<void> {
  return postJson<void>(`/manage/revisions/${revisionId}/publish/`, {
    expected_topic_revision: expectedTopicRevision,
    publish_note: publishNote,
  });
}

/** Restore whatever was published before the current revision. */
export function rollbackTopic(
  toolKey: string,
  topicKey: string,
  comment = ''
): Promise<void> {
  return postJson<void>(`/manage/topics/${toolKey}/${topicKey}/rollback/`, { comment });
}
