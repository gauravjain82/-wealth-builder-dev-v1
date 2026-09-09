/**
 * BuilderAI Invitations API client. Talks to the Django `builderai` app:
 * send / accept / decline / cancel invitations, self-add as a builder, remove a
 * user, and read the seat counter + invitation rules.
 *
 * Roles use the same kebab literals as the UI (`company-owner` / `builder`) and
 * statuses are lower-case, matching the backend serializer.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export type BuilderInviteRole = 'company-owner' | 'builder';
export type BuilderInviteStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';
export type BuilderInviteSegment = 'company' | 'baseshop';
export type BuilderInviteBox = 'sent' | 'received';

export interface BuilderInvitation {
  id: number;
  name: string;
  agency_code: string;
  role: BuilderInviteRole;
  status: BuilderInviteStatus;
  inviter_name: string;
  invitee_name: string;
  created_at: string;
  responded_at: string | null;
}

export interface BuilderInvitationList {
  results: BuilderInvitation[];
  count: number;
}

export interface BuilderSeats {
  total_seats: number;
  used_seats: number;
  available_seats: number;
  rules: string[];
}

export interface SendInvitationPayload {
  full_name: string;
  agency_code: string;
  role: BuilderInviteRole;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

/** Turn a DRF error body into a human message (detail, then first field error). */
async function parseError(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status})`;
  const data = (await response.json().catch(() => null)) as unknown;
  if (!data || typeof data !== 'object') return fallback;

  if ('detail' in data) {
    const detail = (data as { detail?: unknown }).detail;
    if (Array.isArray(detail)) return detail.join(', ');
    if (typeof detail === 'string') return detail;
  }

  const firstFieldError = Object.entries(data as Record<string, unknown>).find(
    ([, value]) => Array.isArray(value) || typeof value === 'string'
  );
  if (!firstFieldError) return fallback;
  const [field, value] = firstFieldError;
  return Array.isArray(value) ? `${field}: ${value.join(', ')}` : `${field}: ${value}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: getAuthHeaders(),
    ...init,
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const builderInvitationsService = {
  list(box: BuilderInviteBox, segment?: BuilderInviteSegment): Promise<BuilderInvitationList> {
    const params = new URLSearchParams({ box });
    if (segment) params.set('segment', segment);
    return request(`/api/builderai/invitations/?${params.toString()}`);
  },
  seats(): Promise<BuilderSeats> {
    return request('/api/builderai/builder-seats/');
  },
  send(payload: SendInvitationPayload): Promise<BuilderInvitation> {
    return request('/api/builderai/invitations/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  accept(id: number): Promise<BuilderInvitation> {
    return request(`/api/builderai/invitations/${id}/accept/`, { method: 'POST' });
  },
  decline(id: number): Promise<BuilderInvitation> {
    return request(`/api/builderai/invitations/${id}/decline/`, { method: 'POST' });
  },
  cancel(id: number): Promise<BuilderInvitation> {
    return request(`/api/builderai/invitations/${id}/cancel/`, { method: 'POST' });
  },
  selfAdd(): Promise<{ success: boolean; seats_remaining: number }> {
    return request('/api/builderai/self-add-builder/', { method: 'POST' });
  },
  removeUser(agencyCode: string): Promise<{ success: boolean }> {
    return request('/api/builderai/invitations/remove-user/', {
      method: 'POST',
      body: JSON.stringify({ agency_code: agencyCode }),
    });
  },
};
