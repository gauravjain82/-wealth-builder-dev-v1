// Door-credential plumbing shared by the desk and session check-in services:
// the structured refusal error, and the link-account-and-admit action.

import type {
  DoorErrorBody,
  DoorErrorCode,
  LinkAccountPayload,
  LinkAccountResult,
} from '../types/door';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Check-in is nested on the events resource — note the double `events/`.
const EVENTS_BASE = '/api/events/events';

/**
 * A refused request. When the body carries a door `code`, `door` holds the
 * whole structured refusal (candidates, account, hold) so the door UI can
 * offer the right next step instead of a bare message.
 */
export class DoorApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly door: DoorErrorBody | null = null,
  ) {
    super(message);
    this.name = 'DoorApiError';
  }

  get code(): DoorErrorCode | null {
    return this.door?.code ?? null;
  }

  get overridable(): boolean {
    return this.door?.overridable === true;
  }
}

/** The structured door refusal behind an error, if there is one. */
export function doorErrorOf(err: unknown): DoorErrorBody | null {
  return err instanceof DoorApiError ? err.door : null;
}

function messageFrom(data: Record<string, unknown>, fallback: string): string {
  const detail = data.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.join(', ');
  const first = Object.entries(data).find(
    ([, value]) => Array.isArray(value) || typeof value === 'string',
  );
  if (!first) return fallback;
  const [field, value] = first;
  const text = Array.isArray(value) ? value.join(', ') : String(value);
  return field === 'non_field_errors' ? text : `${field.replace(/_/g, ' ')}: ${text}`;
}

/** Build the error for a failed response, keeping the door body when present. */
export async function toDoorError(response: Response): Promise<DoorApiError> {
  const fallback = `Request failed (${response.status})`;
  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!data || typeof data !== 'object') return new DoorApiError(fallback, response.status);
  const message = messageFrom(data, fallback);
  const door =
    typeof data.code === 'string' || data.overridable === true
      ? ({
          ...data,
          detail: message,
          code: typeof data.code === 'string' ? data.code : 'error',
          overridable: data.overridable === true,
        } as DoorErrorBody)
      : null;
  return new DoorApiError(message, response.status, door);
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return { Authorization: `Token ${token}`, 'Content-Type': 'application/json' };
}

export const doorService = {
  /**
   * Link a ticket to an account (by id from a profile-QR refusal, or by a fresh
   * profile-QR scan) and admit them — at the desk, or into `session_id`.
   * Throws `DoorApiError`; `no_contact_match` is overridable with
   * `confirm_without_contact_match`.
   */
  async linkAccount(eventId: number, payload: LinkAccountPayload): Promise<LinkAccountResult> {
    const response = await fetch(`${API_BASE_URL}${EVENTS_BASE}/${eventId}/checkin/link/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw await toDoorError(response);
    return response.json() as Promise<LinkAccountResult>;
  },
};
