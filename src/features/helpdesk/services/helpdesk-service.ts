const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

export type HelpdeskCategory =
  | 'login'
  | 'access'
  | 'password_reset'
  | 'team_visibility'
  | 'file_visibility'
  | 'other';

export type HelpdeskStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type HelpdeskPriority = 'low' | 'medium' | 'high';

export interface PublicTicketSubmitPayload {
  name: string;
  email: string;
  category: HelpdeskCategory;
  subject: string;
  description: string;
}

export interface PublicTicketSubmitResponse {
  ticket_number: string;
  name: string;
  email: string;
  category: HelpdeskCategory;
  subject: string;
  description: string;
}

export interface HelpdeskComment {
  id: number;
  body: string;
  is_internal: boolean;
  author_name: string | null;
  created_at: string;
}

export interface HelpdeskTicketLookupResponse {
  ticket_number: string;
  subject: string;
  category: HelpdeskCategory;
  status: HelpdeskStatus;
  priority: HelpdeskPriority;
  created_at: string;
  updated_at: string;
  comments: HelpdeskComment[];
}

export interface AdminTicketListItem {
  ticket_number: string;
  name: string;
  email: string;
  category: HelpdeskCategory;
  subject: string;
  status: HelpdeskStatus;
  priority: HelpdeskPriority;
  created_at: string;
  updated_at: string;
  comment_count: number;
}

export interface AdminTicketDetail extends AdminTicketListItem {
  description: string;
  comments: HelpdeskComment[];
}

interface ApiErrorPayload {
  detail?: string;
  message?: string;
  [key: string]: unknown;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found. Please sign in again.');
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseApiError(response: Response, fallbackMessage: string): Promise<string> {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    if (typeof payload.detail === 'string' && payload.detail.trim()) return payload.detail;
    if (typeof payload.message === 'string' && payload.message.trim()) return payload.message;
    return fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export async function submitHelpdeskTicket(payload: PublicTicketSubmitPayload): Promise<PublicTicketSubmitResponse> {
  const response = await fetch(`${API_BASE_URL}/api/helpdesk/tickets/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to submit help request.'));
  }

  return (await response.json()) as PublicTicketSubmitResponse;
}

export async function lookupHelpdeskTicket(ticket: string, email: string): Promise<HelpdeskTicketLookupResponse> {
  const params = new URLSearchParams({
    ticket,
    email,
  });

  const response = await fetch(`${API_BASE_URL}/api/helpdesk/tickets/lookup/?${params.toString()}`);

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Ticket not found for this ticket number and email.'));
  }

  return (await response.json()) as HelpdeskTicketLookupResponse;
}

export async function fetchAdminHelpdeskTickets(filters: {
  ticket?: string;
  email?: string;
  status?: HelpdeskStatus | '';
  category?: HelpdeskCategory | '';
  priority?: HelpdeskPriority | '';
} = {}): Promise<AdminTicketListItem[]> {
  const params = new URLSearchParams();
  if (filters.ticket?.trim()) params.set('ticket', filters.ticket.trim());
  if (filters.email?.trim()) params.set('email', filters.email.trim());
  if (filters.status) params.set('status', filters.status);
  if (filters.category) params.set('category', filters.category);
  if (filters.priority) params.set('priority', filters.priority);

  const response = await fetch(`${API_BASE_URL}/api/helpdesk/admin/tickets/?${params.toString()}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to load helpdesk tickets.'));
  }

  const data = (await response.json()) as AdminTicketListItem[];
  return Array.isArray(data) ? data : [];
}

export async function fetchAdminHelpdeskTicketDetail(ticketNumber: string): Promise<AdminTicketDetail> {
  const response = await fetch(`${API_BASE_URL}/api/helpdesk/admin/tickets/${encodeURIComponent(ticketNumber)}/`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to load ticket details.'));
  }

  return (await response.json()) as AdminTicketDetail;
}

export async function patchAdminHelpdeskTicket(
  ticketNumber: string,
  payload: {
    status?: HelpdeskStatus;
    priority?: HelpdeskPriority;
  }
): Promise<AdminTicketDetail> {
  const response = await fetch(`${API_BASE_URL}/api/helpdesk/admin/tickets/${encodeURIComponent(ticketNumber)}/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to update ticket.'));
  }

  return (await response.json()) as AdminTicketDetail;
}

export async function createAdminHelpdeskComment(
  ticketNumber: string,
  payload: {
    body: string;
    is_internal?: boolean;
  }
): Promise<HelpdeskComment> {
  const response = await fetch(`${API_BASE_URL}/api/helpdesk/admin/tickets/${encodeURIComponent(ticketNumber)}/comments/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to post comment.'));
  }

  return (await response.json()) as HelpdeskComment;
}

export async function closeAdminHelpdeskTicket(ticketNumber: string): Promise<{ detail: string; ticket_number: string }> {
  const response = await fetch(`${API_BASE_URL}/api/helpdesk/admin/tickets/${encodeURIComponent(ticketNumber)}/close/`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to close ticket.'));
  }

  return (await response.json()) as { detail: string; ticket_number: string };
}
