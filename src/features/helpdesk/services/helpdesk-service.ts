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

/** Filters accepted by the staff ticket list endpoint. */
export interface AdminTicketFilters {
  ticket?: string;
  email?: string;
  status?: HelpdeskStatus | '';
  category?: HelpdeskCategory | '';
  priority?: HelpdeskPriority | '';
}

/** One page of the staff ticket list (DRF page-number pagination shape). */
export interface PaginatedAdminTickets {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminTicketListItem[];
}

/** What the current user may do in Helpdesk Admin (access-console grants). */
export interface HelpdeskAccess {
  /** helpdesk:read: may open Helpdesk Admin and see tickets incl. internal notes. */
  can_view: boolean;
  /** helpdesk:update: may change status/priority, comment and close tickets. */
  can_update: boolean;
}

/** Default page size for the staff ticket list. */
export const ADMIN_TICKETS_PAGE_SIZE = 25;

/** Ask the backend whether the signed-in user may view/update Helpdesk Admin. */
export async function getHelpdeskAccess(): Promise<HelpdeskAccess> {
  const response = await fetch(`${API_BASE_URL}/api/helpdesk/my-access/`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to load helpdesk access.'));
  }

  const data = (await response.json()) as Partial<HelpdeskAccess>;
  return {
    can_view: Boolean(data.can_view),
    can_update: Boolean(data.can_update),
  };
}

/**
 * Load one page of staff tickets matching `filters`.
 *
 * Passing `page` makes the backend paginate; a legacy plain-array response is
 * still accepted and wrapped so callers always get the paginated shape.
 */
export async function fetchAdminHelpdeskTickets(
  filters: AdminTicketFilters = {},
  page: number = 1,
  pageSize: number = ADMIN_TICKETS_PAGE_SIZE
): Promise<PaginatedAdminTickets> {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('page_size', String(pageSize));
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

  const data = (await response.json()) as PaginatedAdminTickets | AdminTicketListItem[];
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }
  return {
    count: typeof data?.count === 'number' ? data.count : 0,
    next: data?.next ?? null,
    previous: data?.previous ?? null,
    results: Array.isArray(data?.results) ? data.results : [],
  };
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
