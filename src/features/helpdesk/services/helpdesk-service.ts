const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

export type HelpdeskCategory =
  | 'login'
  | 'access'
  | 'password_reset'
  | 'team_visibility'
  | 'file_visibility'
  | 'other';

export type HelpdeskStatus = 'open' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';

/** Support tier: L1 = the submitter's SMD office, L2 = central support, L3 = engineering. */
export type HelpdeskTier = 'l1' | 'l2' | 'l3';

/** Server-derived worker-facing state of a ticket (PHASE4_CONTRACT "Ticket state"). */
export type HelpdeskQueueState =
  | 'new'
  | 'user_replied'
  | 'received'
  | 'waiting_on_user'
  | 'in_progress'
  | 'resolved'
  | 'closed';

/** A user reference (assignee, SMD) as `{id, name}`. */
export interface HelpdeskPerson {
  id: number;
  name: string;
}

/** Phase 4 routing/state fields shared by staff and team tickets (absent on older backends). */
export interface HelpdeskQueueFields {
  tier?: HelpdeskTier;
  assignee?: HelpdeskPerson | null;
  smd?: HelpdeskPerson | null;
  queue_state?: HelpdeskQueueState | string;
  needs_action?: boolean;
  acknowledged_at?: string | null;
  first_response_at?: string | null;
  last_user_reply_at?: string | null;
  escalated_at?: string | null;
  escalation_reason?: string | null;
}

/** Derived SLA state of a ticket (PHASE5_CONTRACT "sla_state"). */
export type HelpdeskSlaState = 'none' | 'paused' | 'ok' | 'due_soon' | 'breached';

/** Which SLA target is currently running. */
export type HelpdeskSlaTarget = 'first_response' | 'resolution';

/** Phase 5 SLA fields shared by staff and team tickets (absent on older backends). */
export interface HelpdeskSlaFields {
  sla_state?: HelpdeskSlaState | string;
  sla_target?: HelpdeskSlaTarget | null;
  /** Due time of the active target; null when none/paused. */
  sla_due_at?: string | null;
  first_response_due_at?: string | null;
  resolution_due_at?: string | null;
  /** First breach of any target. */
  sla_breached_at?: string | null;
}
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

/** How a ticket was raised. */
export type HelpdeskSource = 'widget' | 'public_form' | 'telegram';

/** A stored image on a ticket or comment; `url` is signed and expires after ~15 min. */
export interface HelpdeskAttachment {
  id: number;
  file_name: string;
  content_type: string;
  size_bytes: number;
  kind: 'screenshot' | 'upload';
  url: string;
}

export interface HelpdeskComment {
  id: number;
  body: string;
  is_internal: boolean;
  author_name: string | null;
  created_at: string;
  /** Phase 3: staff detail only. */
  is_staff_reply?: boolean;
  /** Phase 3: staff detail only. */
  attachments?: HelpdeskAttachment[];
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

export interface AdminTicketListItem extends HelpdeskQueueFields, HelpdeskSlaFields {
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
  /** Phase 3 additions (absent on older backends). */
  source?: HelpdeskSource | string;
  page_path?: string;
  attachment_count?: number;
}

export interface AdminTicketDetail extends AdminTicketListItem {
  description: string;
  comments: HelpdeskComment[];
  /** Sanitised support context (see SupportContext) or `{}`. */
  context?: Partial<SupportContextPayload> | Record<string, never>;
  /** Set only when an assistant reported the ticket on an SMD's behalf. */
  reported_by_name?: string | null;
  attachments?: HelpdeskAttachment[];
}

/** One failed API call recorded by the client error buffer. */
export interface SupportApiError {
  method: string;
  url: string;
  status: number;
  at: string;
  request_id: string;
}

/** One uncaught JS error / unhandled rejection recorded by the client error buffer. */
export interface SupportJsError {
  message: string;
  source: string;
  at: string;
}

/** Allow-listed page context attached to a widget ticket (PHASE3_CONTRACT schema). */
export interface SupportContextPayload {
  captured_at: string;
  page: { path: string; search: string; title: string; label: string };
  route_params: Record<string, string>;
  app: { version: string; build_time: string };
  env: {
    user_agent: string;
    platform: string;
    language: string;
    timezone: string;
    viewport: { w: number; h: number };
    screen: { w: number; h: number };
    dpr: number;
    online: boolean;
  };
  session: { acting_as_assistant: boolean };
  recent_api_errors: SupportApiError[];
  recent_js_errors: SupportJsError[];
}

/** A signed-in user's own ticket comment (public only). */
export interface MyTicketComment {
  id: number;
  body: string;
  author_name: string;
  is_staff_reply: boolean;
  created_at: string;
  attachments: HelpdeskAttachment[];
}

/** Row in the "My tickets" list. */
export interface MyTicketListItem {
  ticket_number: string;
  subject: string;
  category: HelpdeskCategory | string;
  status: HelpdeskStatus | string;
  priority: HelpdeskPriority | string;
  created_at: string;
  updated_at: string;
  reply_count: number;
  last_reply_at: string | null;
}

/** Full view of one of the signed-in user's tickets. */
export interface MyTicketDetail extends MyTicketListItem {
  description: string;
  source: HelpdeskSource | string;
  page_path: string;
  comments: MyTicketComment[];
  attachments: HelpdeskAttachment[];
}

/** One page of the user's tickets (DRF page-number pagination shape). */
export interface PaginatedMyTickets {
  count: number;
  next: string | null;
  previous: string | null;
  results: MyTicketListItem[];
}

/** Fields of a new widget ticket. `context` is omitted when the user unticks page details. */
export interface CreateMyTicketPayload {
  category: HelpdeskCategory;
  subject: string;
  description: string;
  context?: SupportContextPayload | null;
  attachments?: File[];
}

/** Error thrown by the "my tickets" calls, carrying the backend `code`/`field` when given. */
export class HelpdeskApiError extends Error {
  /** HTTP status of the failed response. */
  readonly status: number;
  /** Backend error code, e.g. `file_size_invalid` or `ticket_closed`. */
  readonly code?: string;
  /** Per-field messages from a DRF validation error. */
  readonly fieldErrors: Record<string, string>;

  constructor(message: string, status: number, code?: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'HelpdeskApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/** Page size for the "My tickets" list. */
export const MY_TICKETS_PAGE_SIZE = 20;

/** Path of the widget submit endpoint (also skipped by the client error buffer). */
export const MY_TICKETS_PATH = '/api/helpdesk/my/tickets/';

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

/** Authorization header only, for multipart bodies (the browser sets the boundary). */
function getAuthOnlyHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found. Please sign in again.');
  return { Authorization: `Token ${token}` };
}

/** Flatten a DRF error value (string | string[] | nested) to one message. */
function firstMessage(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const msg = firstMessage(item);
      if (msg) return msg;
    }
  }
  return null;
}

/** Build a HelpdeskApiError from a failed response: `detail`, then field messages. */
async function toHelpdeskApiError(response: Response, fallbackMessage: string): Promise<HelpdeskApiError> {
  let payload: ApiErrorPayload | null = null;
  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    return new HelpdeskApiError(fallbackMessage, response.status);
  }
  const code = typeof payload?.code === 'string' ? payload.code : undefined;
  const fieldErrors: Record<string, string> = {};
  if (payload && typeof payload === 'object') {
    for (const [key, value] of Object.entries(payload)) {
      if (['detail', 'message', 'code', 'field'].includes(key)) continue;
      const msg = firstMessage(value);
      if (msg) fieldErrors[key] = msg;
    }
  }
  const detail = firstMessage(payload?.detail) || firstMessage(payload?.message);
  const fieldSummary = Object.entries(fieldErrors)
    .map(([key, msg]) => (key === 'non_field_errors' ? msg : `${key.replace(/_/g, ' ')}: ${msg}`))
    .join(' ');
  if (detail && typeof payload?.field === 'string') fieldErrors[payload.field] = detail;
  return new HelpdeskApiError(detail || fieldSummary || fallbackMessage, response.status, code, fieldErrors);
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
  /** Phase 4: restrict to one tier. */
  tier?: HelpdeskTier | '';
  /** Phase 4: `me`, `none` (unassigned) or a user id. */
  assignee?: 'me' | 'none' | number | '';
  /** Phase 4: only tickets that need action. */
  needs_action?: boolean;
  /** Phase 4: server-side view shortcut. */
  view?: AdminTicketView | '';
}

/** Server-side view shortcuts on the staff list (`?view=`). */
export type AdminTicketView = 'needs_action' | 'at_risk' | 'mine' | 'unassigned' | 'waiting' | 'l1' | 'resolved';

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
  /** helpdesk:engineering: works the L3 (engineering) queue. */
  can_engineer: boolean;
  /** Active SMD (or their assistant signed in as them): works the L1 Team Support queue. */
  team_queue: boolean;
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
    can_engineer: Boolean(data.can_engineer),
    team_queue: Boolean(data.team_queue),
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
  if (filters.tier) params.set('tier', filters.tier);
  if (filters.assignee !== undefined && filters.assignee !== '') params.set('assignee', String(filters.assignee));
  if (filters.needs_action) params.set('needs_action', '1');
  if (filters.view) params.set('view', filters.view);

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

/** Load one page of the signed-in user's own tickets. */
export async function fetchMyTickets(page: number = 1, pageSize: number = MY_TICKETS_PAGE_SIZE): Promise<PaginatedMyTickets> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  const response = await fetch(`${API_BASE_URL}${MY_TICKETS_PATH}?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw await toHelpdeskApiError(response, 'Failed to load your tickets.');
  const data = (await response.json()) as PaginatedMyTickets | MyTicketListItem[];
  if (Array.isArray(data)) return { count: data.length, next: null, previous: null, results: data };
  return {
    count: typeof data?.count === 'number' ? data.count : 0,
    next: data?.next ?? null,
    previous: data?.previous ?? null,
    results: Array.isArray(data?.results) ? data.results : [],
  };
}

/** Load one of the signed-in user's tickets with its public conversation. */
export async function fetchMyTicket(ticketNumber: string): Promise<MyTicketDetail> {
  const response = await fetch(`${API_BASE_URL}${MY_TICKETS_PATH}${encodeURIComponent(ticketNumber)}/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw await toHelpdeskApiError(response, 'Failed to load ticket.');
  return (await response.json()) as MyTicketDetail;
}

/** Raise a ticket from the "Report a problem" widget (multipart: context JSON + images). */
export async function createMyTicket(payload: CreateMyTicketPayload): Promise<MyTicketDetail> {
  const form = new FormData();
  form.append('category', payload.category);
  form.append('subject', payload.subject);
  form.append('description', payload.description);
  if (payload.context) form.append('context', JSON.stringify(payload.context));
  for (const file of payload.attachments ?? []) form.append('attachments', file, file.name);

  const response = await fetch(`${API_BASE_URL}${MY_TICKETS_PATH}`, {
    method: 'POST',
    headers: getAuthOnlyHeaders(),
    body: form,
  });
  if (!response.ok) throw await toHelpdeskApiError(response, 'Failed to create ticket.');
  return (await response.json()) as MyTicketDetail;
}

/** Reply on one of the user's tickets; 409 `ticket_closed` when the ticket is closed. */
export async function replyToMyTicket(
  ticketNumber: string,
  payload: { body: string; attachments?: File[] }
): Promise<MyTicketComment> {
  const form = new FormData();
  form.append('body', payload.body);
  for (const file of payload.attachments ?? []) form.append('attachments', file, file.name);

  const response = await fetch(`${API_BASE_URL}${MY_TICKETS_PATH}${encodeURIComponent(ticketNumber)}/comments/`, {
    method: 'POST',
    headers: getAuthOnlyHeaders(),
    body: form,
  });
  if (!response.ok) throw await toHelpdeskApiError(response, 'Failed to post reply.');
  return (await response.json()) as MyTicketComment;
}

// ---------------------------------------------------------------------------
// Phase 4: queue counts, staff routing actions, Team Support (L1) queue.
// ---------------------------------------------------------------------------

/** Staff-side counters in `queue/counts/`. */
export interface StaffQueueCounts {
  needs_action: number;
  new: number;
  user_replied: number;
  mine_open: number;
  unassigned: number;
  waiting_on_user: number;
  l1_open: number;
  l3_open: number;
  /** Phase 5: open tickets this section owns that are due soon / past due. */
  due_soon: number;
  breached: number;
}

/** Team (L1) counters in `queue/counts/`. */
export interface TeamQueueCounts {
  needs_action: number;
  new: number;
  user_replied: number;
  open: number;
  waiting_on_user: number;
  /** Phase 5: open L1 tickets due soon / past due. */
  due_soon: number;
  breached: number;
}

/** "Needs you" counters; a section is null when the user doesn't work that queue. */
export interface HelpdeskQueueCounts {
  total_needs_action: number;
  /** Phase 5: overdue tickets across both sections. */
  total_breached: number;
  staff: StaffQueueCounts | null;
  team: TeamQueueCounts | null;
}

/** Views of the Team Support list (`team/tickets/?view=`). */
export type TeamTicketView = 'needs_action' | 'at_risk' | 'open' | 'waiting' | 'escalated' | 'resolved';

/** Team list row: the staff row without the submitter's email. */
export type TeamTicketListItem = Omit<AdminTicketListItem, 'email'> & { email?: string };

/** Team ticket detail (internal notes included only while the ticket is L1). */
export interface TeamTicketDetail extends TeamTicketListItem {
  description: string;
  comments: HelpdeskComment[];
  context?: Partial<SupportContextPayload> | Record<string, never>;
  reported_by_name?: string | null;
  attachments?: HelpdeskAttachment[];
}

/** One page of the Team Support list. */
export interface PaginatedTeamTickets {
  count: number;
  next: string | null;
  previous: string | null;
  results: TeamTicketListItem[];
}

/** Page size for the Team Support list. */
export const TEAM_TICKETS_PAGE_SIZE = 25;

const TEAM_TICKETS_PATH = '/api/helpdesk/team/tickets/';

/** Coerce a possibly-missing number to 0. */
function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** "Needs you" counters for the header, sidebar badges and queue tabs. */
export async function fetchQueueCounts(): Promise<HelpdeskQueueCounts> {
  const response = await fetch(`${API_BASE_URL}/api/helpdesk/queue/counts/`, { headers: getAuthHeaders() });
  if (!response.ok) throw await toHelpdeskApiError(response, 'Failed to load queue counts.');
  const data = (await response.json()) as Partial<{
    total_needs_action: number;
    total_breached: number;
    staff: Partial<StaffQueueCounts> | null;
    team: Partial<TeamQueueCounts> | null;
  }>;
  const staff = data.staff
    ? {
        needs_action: num(data.staff.needs_action),
        new: num(data.staff.new),
        user_replied: num(data.staff.user_replied),
        mine_open: num(data.staff.mine_open),
        unassigned: num(data.staff.unassigned),
        waiting_on_user: num(data.staff.waiting_on_user),
        l1_open: num(data.staff.l1_open),
        l3_open: num(data.staff.l3_open),
        due_soon: num(data.staff.due_soon),
        breached: num(data.staff.breached),
      }
    : null;
  const team = data.team
    ? {
        needs_action: num(data.team.needs_action),
        new: num(data.team.new),
        user_replied: num(data.team.user_replied),
        open: num(data.team.open),
        waiting_on_user: num(data.team.waiting_on_user),
        due_soon: num(data.team.due_soon),
        breached: num(data.team.breached),
      }
    : null;
  return { total_needs_action: num(data.total_needs_action), total_breached: num(data.total_breached), staff, team };
}

/** POST a JSON body (or nothing) to a staff ticket action and return the updated detail. */
async function postAdminTicketAction(
  ticketNumber: string,
  action: string,
  body: Record<string, unknown> | undefined,
  fallbackMessage: string
): Promise<AdminTicketDetail> {
  const response = await fetch(
    `${API_BASE_URL}/api/helpdesk/admin/tickets/${encodeURIComponent(ticketNumber)}/${action}/`,
    { method: 'POST', headers: getAuthHeaders(), body: body ? JSON.stringify(body) : undefined }
  );
  if (!response.ok) throw await toHelpdeskApiError(response, fallbackMessage);
  return (await response.json()) as AdminTicketDetail;
}

/** Mark a staff ticket received (no-op unless the caller owns it). Idempotent. */
export function acknowledgeAdminTicket(ticketNumber: string): Promise<AdminTicketDetail> {
  return postAdminTicketAction(ticketNumber, 'acknowledge', undefined, 'Failed to acknowledge ticket.');
}

/** Assign a staff ticket to `me`, a user id, or nobody (`null`). */
export function assignAdminTicket(ticketNumber: string, assignee: 'me' | number | null): Promise<AdminTicketDetail> {
  return postAdminTicketAction(ticketNumber, 'assign', { assignee }, 'Failed to assign ticket.');
}

/** Move a staff ticket to L2 or L3 (reason required); clears the assignee. */
export function escalateAdminTicket(
  ticketNumber: string,
  payload: { to: 'l2' | 'l3'; reason: string }
): Promise<AdminTicketDetail> {
  return postAdminTicketAction(ticketNumber, 'escalate', payload, 'Failed to escalate ticket.');
}

/** People who may be assigned tickets in `tier` (the assign dropdown). */
export async function fetchAdminAssignees(tier: 'l2' | 'l3'): Promise<HelpdeskPerson[]> {
  const response = await fetch(`${API_BASE_URL}/api/helpdesk/admin/assignees/?tier=${tier}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw await toHelpdeskApiError(response, 'Failed to load assignees.');
  const data = (await response.json()) as HelpdeskPerson[] | { results?: HelpdeskPerson[] };
  return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
}

/** One page of the SMD's L1 queue for `view`. */
export async function fetchTeamTickets(view: TeamTicketView, page: number = 1): Promise<PaginatedTeamTickets> {
  const params = new URLSearchParams({ view, page: String(page), page_size: String(TEAM_TICKETS_PAGE_SIZE) });
  const response = await fetch(`${API_BASE_URL}${TEAM_TICKETS_PATH}?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw await toHelpdeskApiError(response, 'Failed to load team tickets.');
  const data = (await response.json()) as PaginatedTeamTickets | TeamTicketListItem[];
  if (Array.isArray(data)) return { count: data.length, next: null, previous: null, results: data };
  return {
    count: typeof data?.count === 'number' ? data.count : 0,
    next: data?.next ?? null,
    previous: data?.previous ?? null,
    results: Array.isArray(data?.results) ? data.results : [],
  };
}

/** One team ticket with its conversation, context and attachments. */
export async function fetchTeamTicket(ticketNumber: string): Promise<TeamTicketDetail> {
  const response = await fetch(`${API_BASE_URL}${TEAM_TICKETS_PATH}${encodeURIComponent(ticketNumber)}/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw await toHelpdeskApiError(response, 'Failed to load ticket.');
  return (await response.json()) as TeamTicketDetail;
}

/** Mark a team ticket received. Idempotent. */
export async function acknowledgeTeamTicket(ticketNumber: string): Promise<TeamTicketDetail> {
  const response = await fetch(`${API_BASE_URL}${TEAM_TICKETS_PATH}${encodeURIComponent(ticketNumber)}/acknowledge/`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw await toHelpdeskApiError(response, 'Failed to acknowledge ticket.');
  return (await response.json()) as TeamTicketDetail;
}

/** Reply or add an internal note on a team ticket (multipart, 0–3 images). Only while L1. */
export async function createTeamComment(
  ticketNumber: string,
  payload: { body: string; is_internal: boolean; attachments?: File[] }
): Promise<HelpdeskComment> {
  const form = new FormData();
  form.append('body', payload.body);
  form.append('is_internal', payload.is_internal ? 'true' : 'false');
  for (const file of payload.attachments ?? []) form.append('attachments', file, file.name);
  const response = await fetch(`${API_BASE_URL}${TEAM_TICKETS_PATH}${encodeURIComponent(ticketNumber)}/comments/`, {
    method: 'POST',
    headers: getAuthOnlyHeaders(),
    body: form,
  });
  if (!response.ok) throw await toHelpdeskApiError(response, 'Failed to post comment.');
  return (await response.json()) as HelpdeskComment;
}

/** Statuses a team (L1) worker may set. */
export type TeamTicketStatus = 'in_progress' | 'waiting_on_user' | 'resolved';

/** Change a team ticket's status. Only while L1. */
export async function patchTeamTicket(ticketNumber: string, payload: { status: TeamTicketStatus }): Promise<TeamTicketDetail> {
  const response = await fetch(`${API_BASE_URL}${TEAM_TICKETS_PATH}${encodeURIComponent(ticketNumber)}/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await toHelpdeskApiError(response, 'Failed to update ticket.');
  return (await response.json()) as TeamTicketDetail;
}

/** Hand a team ticket to central support (L2); reason required. */
export async function escalateTeamTicket(ticketNumber: string, reason: string): Promise<TeamTicketDetail> {
  const response = await fetch(`${API_BASE_URL}${TEAM_TICKETS_PATH}${encodeURIComponent(ticketNumber)}/escalate/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) throw await toHelpdeskApiError(response, 'Failed to escalate ticket.');
  return (await response.json()) as TeamTicketDetail;
}
