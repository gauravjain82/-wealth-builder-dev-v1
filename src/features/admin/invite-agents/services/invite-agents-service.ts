const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const FRONTEND_BASE_URL = import.meta.env.VITE_FRONTEND_BASE_URL || window.location.origin;

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

export interface Invitation {
  id: number;
  token: string;
  email: string;
  to_name: string;
  invited_by: number;
  invited_by_name: string;
  status: 'pending' | 'cancelled';
  public_url: string;
  expires_at: string;
  created_at: string;
}

export interface InvitationsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Invitation[];
}

export interface RegistrationEmailLog {
  id: number;
  email_address?: string | null;
  status?: string | null;
  action?: string | null;
  requested_on?: string | null;
  sent_on?: string | null;
  delivered_at?: string | null;
  first_opened_at?: string | null;
}

export interface AgencyCodeAssignment {
  id: number;
  user?: number | null;
  full_name?: string | null;
  user_name?: string | null;
  email?: string | null;
  agency_code?: string | null;
  assigned_at?: string | null;
  latest_email?: RegistrationEmailLog | null;
}

export interface AgencyCodeAssignmentsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AgencyCodeAssignment[];
}

export async function fetchInvitations(params: {
  page?: number;
  pageSize?: number;
  search?: string;
} = {}): Promise<InvitationsResponse> {
  const p = new URLSearchParams();
  if (params.page && params.page > 1) p.set('page', String(params.page));
  if (params.pageSize) p.set('page_size', String(params.pageSize));
  if (params.search?.trim()) p.set('search', params.search.trim());

  const qs = p.toString();
  const url = `${API_BASE_URL}/api/accounts/invitations/${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, { headers: getAuthHeaders() });

  if (!response.ok) {
    throw new Error(`Failed to fetch invitations: ${response.statusText}`);
  }

  const data = await response.json();
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data as Invitation[] };
  }
  return data as InvitationsResponse;
}

export async function fetchAgencyCodeAssignments(params: {
  page?: number;
  pageSize?: number;
  search?: string;
} = {}): Promise<AgencyCodeAssignmentsResponse> {
  const p = new URLSearchParams();
  if (params.page && params.page > 1) p.set('page', String(params.page));
  if (params.pageSize) p.set('page_size', String(params.pageSize));
  if (params.search?.trim()) p.set('search', params.search.trim());

  const qs = p.toString();
  const url = `${API_BASE_URL}/api/accounts/agency-code-assignments/${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, { headers: getAuthHeaders() });

  if (!response.ok) {
    throw new Error(`Failed to fetch agency code assignments: ${response.statusText}`);
  }

  const data = await response.json();
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data as AgencyCodeAssignment[] };
  }
  return data as AgencyCodeAssignmentsResponse;
}

export async function sendInvitation(email: string, toName: string): Promise<Invitation> {
  const response = await fetch(`${API_BASE_URL}/api/accounts/invitations/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      email: email.trim(),
      to_name: toName.trim(),
      public_url: FRONTEND_BASE_URL,
    }),
  });

  if (!response.ok) {
    let message = `Failed to send invitation: ${response.statusText}`;
    try {
      const data = await response.json();
      const fieldError = Object.values(data || {}).find((v) => Array.isArray(v)) as
        | string[]
        | undefined;
      message = data?.detail || fieldError?.[0] || data?.message || message;
    } catch {
      // Keep fallback.
    }
    throw new Error(message);
  }

  return (await response.json()) as Invitation;
}

export async function resendInvitation(id: number): Promise<Invitation> {
  const response = await fetch(`${API_BASE_URL}/api/accounts/invitations/${id}/resend/`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    let message = `Failed to resend invitation: ${response.statusText}`;
    try {
      const data = await response.json();
      message = data?.detail || data?.message || message;
    } catch {
      // Keep fallback.
    }
    throw new Error(message);
  }

  return (await response.json()) as Invitation;
}

export async function resendAgencyCodeAssignment(id: number): Promise<AgencyCodeAssignment> {
  const response = await fetch(`${API_BASE_URL}/api/accounts/agency-code-assignments/${id}/resend/`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    let message = `Failed to resend registration email: ${response.statusText}`;
    try {
      const data = await response.json();
      message = data?.detail || data?.message || message;
    } catch {
      // Keep fallback.
    }
    throw new Error(message);
  }

  return (await response.json()) as AgencyCodeAssignment;
}

export async function deleteInvitation(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/accounts/invitations/${id}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (response.ok || response.status === 204) return;

  let message = `Failed to delete invitation: ${response.statusText}`;
  try {
    const data = await response.json();
    message = data?.detail || data?.message || message;
  } catch {
    // Keep fallback.
  }
  throw new Error(message);
}
