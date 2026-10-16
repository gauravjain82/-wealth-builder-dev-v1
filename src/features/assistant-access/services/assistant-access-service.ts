/**
 * API client for `/api/assistant-access/`: the public invite preview/accept used by the
 * assistant's set-password page, and the SMD's own access management (`me/`).
 * Every path ends in `/` so Django's APPEND_SLASH never drops a POST body.
 */

import type {
  AssistantAccessDetailResponse,
  AssistantAccessMeResponse,
  AssistantInviteAcceptInput,
  AssistantInvitePreview,
} from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
const BASE = '/api/assistant-access';

/** The 403 `code` the backend answers when an assistant tries a denied action. */
export const ASSISTANT_FORBIDDEN_CODE = 'assistant_forbidden';

/** An API failure carrying the HTTP status and the backend's `code`, when given. */
export class AssistantAccessError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'AssistantAccessError';
    this.status = status;
    this.code = code;
  }
}

/**
 * True when a parsed error body is the assistant deny-list 403
 * (`{"detail": "...", "code": "assistant_forbidden"}`). Usable by any service.
 */
export function isAssistantForbidden(status: number, body: unknown): boolean {
  return (
    status === 403 &&
    typeof body === 'object' &&
    body !== null &&
    (body as { code?: unknown }).code === ASSISTANT_FORBIDDEN_CODE
  );
}

function authHeaders(): HeadersInit {
  return {
    Authorization: `Token ${localStorage.getItem('wb.authToken')}`,
    'Content-Type': 'application/json',
  };
}

/** Turn a non-2xx response into an `AssistantAccessError`; parse guardedly (a proxy may answer HTML). */
async function describeFailure(response: Response, fallback: string): Promise<AssistantAccessError> {
  try {
    const body = (await response.json()) as Record<string, unknown>;
    const detail = typeof body?.detail === 'string' && body.detail.trim() ? body.detail : '';
    const firstField = Object.values(body ?? {}).find(
      (value): value is string[] => Array.isArray(value) && typeof value[0] === 'string'
    );
    return new AssistantAccessError(
      detail || firstField?.[0] || fallback,
      response.status,
      typeof body?.code === 'string' ? body.code : undefined
    );
  } catch {
    return new AssistantAccessError(fallback, response.status);
  }
}

async function request<T>(path: string, init: RequestInit, fallback: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${BASE}${path}`, init);
  if (!response.ok) throw await describeFailure(response, fallback);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/* --- public invite (no auth) ------------------------------------------------ */

/** Preview an invite link. An unknown, used or expired token answers 404. */
export function fetchInvitePreview(token: string, signal?: AbortSignal): Promise<AssistantInvitePreview> {
  return request(
    `/invite/?token=${encodeURIComponent(token)}`,
    { signal },
    'This invite link is invalid or has expired.'
  );
}

/** Set the assistant's password; the access becomes `active`. */
export function acceptInvite(input: AssistantInviteAcceptInput): Promise<AssistantAccessDetailResponse> {
  return request(
    '/invite/accept/',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) },
    'Unable to set your password. Please try again.'
  );
}

/* --- SMD's own access ------------------------------------------------------- */

/** The signed-in SMD's assistant access, or `{access: null}` when there is none. */
export function fetchMyAssistantAccess(signal?: AbortSignal): Promise<AssistantAccessMeResponse> {
  return request('/me/', { headers: authHeaders(), signal }, 'Failed to load assistant access.');
}

/** Re-issue the invite email (status becomes `invited`). */
export function resendAssistantInvite(): Promise<AssistantAccessDetailResponse> {
  return request('/me/resend-invite/', { method: 'POST', headers: authHeaders() }, 'Failed to resend the invite.');
}

/** Revoke the assistant's login (the plug-in fees record is untouched). */
export function revokeAssistantAccess(): Promise<AssistantAccessDetailResponse> {
  return request('/me/revoke/', { method: 'POST', headers: authHeaders() }, 'Failed to revoke access.');
}
