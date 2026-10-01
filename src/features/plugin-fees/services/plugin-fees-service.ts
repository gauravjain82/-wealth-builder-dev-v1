/**
 * API client for the plug-in fees P2 and P3 surfaces: the agent's own office / assistant /
 * payment-method sections on Settings, the Hierarchy Assistant review queues (P2), and
 * statements of account, billing cycles and recognition costs (P3, contract §5), and
 * collection — pay links, the payments dashboard, follow-ups, SMD balances and sending
 * (P4, contract §6).
 *
 * Contract: `mlm_platform/docs/plugin_fees/API.md` (consumed endpoints are listed in
 * `docs/plugin-fees/API.md` §2). Every path ends in `/` — Django's APPEND_SLASH would
 * otherwise redirect and drop a POST body. Every endpoint is authorised server-side;
 * hiding a control here is not authorisation.
 */

import type {
  AgentStatement,
  ApproveCycleInput,
  AssistantDecision,
  AssistantReviewItem,
  AssistantReviewStatus,
  AssistantSubmission,
  AssistantSubmissionInput,
  CostInput,
  CostsQuery,
  CycleReport,
  CycleSummary,
  DecisionInput,
  DeleteCostInput,
  FollowUp,
  FollowUpStatusFilter,
  OfficeDecision,
  OfficeReviewItem,
  OfficeReviewStatus,
  OfficeSubmission,
  OfficeSubmissionInput,
  Paginated,
  PayLinkResponse,
  PaymentPreference,
  PaymentsDashboard,
  PluginFeesAccess,
  PluginFeesErrorCode,
  PluginFeesMe,
  PluginFeesPaymentMethod,
  PluginFeesStatement,
  RecognitionCost,
  ResolveFollowUpInput,
  ReviewQuery,
  SendCycleResponse,
  SetupSessionResponse,
  SmdBalance,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const BASE = '/api/plugin-fees';

/** An API failure carrying the backend's stable `code` and, for validation, its `fields`. */
export class PluginFeesError extends Error {
  readonly status: number;
  readonly code?: PluginFeesErrorCode | string;
  readonly fields?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    code?: PluginFeesErrorCode | string,
    fields?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'PluginFeesError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

function getToken(): string | null {
  return localStorage.getItem('wb.authToken');
}

function getJsonHeaders(): HeadersInit {
  return {
    Authorization: `Token ${getToken()}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Multipart uploads send only the Authorization header: the browser must set
 * `Content-Type` itself so the boundary is included. Same approach as
 * `getMultipartAuthHeaders()` in `src/features/settings/services/settings-billing-service.ts`.
 */
function getMultipartHeaders(): HeadersInit {
  const token = getToken();
  if (!token) {
    throw new PluginFeesError('No authentication token found. Please sign in again.', 401);
  }
  return { Authorization: `Token ${token}` };
}

/** Turn a non-2xx response into a `PluginFeesError`; a proxy may answer HTML, so parse guardedly. */
async function describeFailure(response: Response): Promise<PluginFeesError> {
  try {
    const body = await response.json();
    const fields =
      body && typeof body.fields === 'object' && body.fields !== null
        ? (body.fields as Record<string, string[]>)
        : undefined;
    return new PluginFeesError(
      typeof body?.detail === 'string' ? body.detail : `Request failed: ${response.status}`,
      response.status,
      typeof body?.code === 'string' ? body.code : undefined,
      fields
    );
  } catch {
    return new PluginFeesError(`Request failed: ${response.status}`, response.status);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${BASE}${path}`, init);
  if (!response.ok) throw await describeFailure(response);
  // A DELETE answers 204 with no body.
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>(path, { headers: getJsonHeaders(), signal });
}

function postJson<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: getJsonHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** A DELETE with a JSON body (the cost delete carries a required `reason`). */
function deleteJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'DELETE',
    headers: getJsonHeaders(),
    body: JSON.stringify(body),
  });
}

function postMultipart<T>(path: string, form: FormData): Promise<T> {
  return request<T>(path, { method: 'POST', headers: getMultipartHeaders(), body: form });
}

/* --- access & own data ----------------------------------------------------- */

export function fetchPluginFeesAccess(signal?: AbortSignal): Promise<PluginFeesAccess> {
  return getJson('/my-access/', signal);
}

export function fetchMyPluginFees(signal?: AbortSignal): Promise<PluginFeesMe> {
  return getJson('/me/', signal);
}

export function submitOffice(input: OfficeSubmissionInput): Promise<OfficeSubmission> {
  const form = new FormData();
  form.append('address_line1', input.address_line1);
  form.append('address_line2', input.address_line2);
  form.append('city', input.city);
  form.append('state', input.state);
  form.append('zip', input.zip);
  form.append('lease', input.lease);
  form.append('photo', input.photo);
  return postMultipart('/me/office/', form);
}

export function withdrawOffice(id: number): Promise<OfficeSubmission> {
  return postJson(`/me/office/${id}/withdraw/`);
}

export function submitAssistant(input: AssistantSubmissionInput): Promise<AssistantSubmission> {
  const form = new FormData();
  form.append('name', input.name);
  form.append('phone', input.phone);
  form.append('email', input.email);
  // The contract takes `hours` as a JSON string inside the multipart body.
  form.append('hours', JSON.stringify(input.hours));
  form.append('photo', input.photo);
  return postMultipart('/me/assistant/', form);
}

export function withdrawAssistant(id: number): Promise<AssistantSubmission> {
  return postJson(`/me/assistant/${id}/withdraw/`);
}

/** Automatic debit on the 1st, or pay each month myself (bank, card or Klarna). */
export function setPaymentPreference(preference: PaymentPreference): Promise<PluginFeesPaymentMethod> {
  return postJson('/me/payment-preference/', { preference });
}

/** Starts a Stripe setup session; the caller redirects the browser to `url`. */
export function createPaymentMethodSetupSession(returnPath: string): Promise<SetupSessionResponse> {
  return postJson('/me/payment-method/setup-session/', { return_path: returnPath });
}

/* --- review queues --------------------------------------------------------- */

function reviewParams(query: ReviewQuery<string>): string {
  const params = new URLSearchParams();
  params.set('status', query.status);
  if (query.search.trim()) params.set('search', query.search.trim());
  params.set('page', String(query.page));
  return params.toString();
}

export function fetchOfficeReviews(
  query: ReviewQuery<OfficeReviewStatus>,
  signal?: AbortSignal
): Promise<Paginated<OfficeReviewItem>> {
  return getJson(`/review/offices/?${reviewParams(query)}`, signal);
}

export function fetchAssistantReviews(
  query: ReviewQuery<AssistantReviewStatus>,
  signal?: AbortSignal
): Promise<Paginated<AssistantReviewItem>> {
  return getJson(`/review/assistants/?${reviewParams(query)}`, signal);
}

export function decideOffice(input: DecisionInput<OfficeDecision>): Promise<OfficeSubmission> {
  return postJson(`/review/offices/${input.id}/decide/`, {
    decision: input.decision,
    note: input.note,
  });
}

export function decideAssistant(
  input: DecisionInput<AssistantDecision>
): Promise<AssistantSubmission> {
  return postJson(`/review/assistants/${input.id}/decide/`, {
    decision: input.decision,
    note: input.note,
  });
}

/* --- P3: statements -------------------------------------------------------- */

export function fetchMyStatement(signal?: AbortSignal): Promise<PluginFeesStatement> {
  return getJson('/me/statement/', signal);
}

export function fetchAgentStatement(id: number, signal?: AbortSignal): Promise<AgentStatement> {
  return getJson(`/agents/${id}/statement/`, signal);
}

/* --- P3: billing cycles ---------------------------------------------------- */

export function fetchCycles(signal?: AbortSignal): Promise<CycleSummary[]> {
  return getJson('/cycles/', signal);
}

/** The dry run: writes nothing. For a month already generated it returns the stored report. */
export function fetchCyclePreview(month: string, signal?: AbortSignal): Promise<CycleReport> {
  return getJson(`/cycles/preview/?month=${encodeURIComponent(month)}`, signal);
}

export function fetchCycleReport(month: string, signal?: AbortSignal): Promise<CycleReport> {
  return getJson(`/cycles/${encodeURIComponent(month)}/`, signal);
}

export function approveCycle(input: ApproveCycleInput): Promise<CycleReport> {
  return postJson(`/cycles/${encodeURIComponent(input.month)}/approve/`, { note: input.note });
}

/* --- P3: recognition and mailing costs ------------------------------------- */

export function fetchCosts(
  query: CostsQuery,
  signal?: AbortSignal
): Promise<Paginated<RecognitionCost>> {
  const params = new URLSearchParams();
  if (query.smd !== null) params.set('smd', String(query.smd));
  if (query.month) params.set('month', query.month);
  params.set('page', String(query.page));
  return getJson(`/costs/?${params.toString()}`, signal);
}

export function createCost(input: CostInput): Promise<RecognitionCost> {
  return postJson('/costs/', input);
}

export function deleteCost(input: DeleteCostInput): Promise<void> {
  return deleteJson(`/costs/${input.id}/`, { reason: input.reason });
}

/* --- P4: collection -------------------------------------------------------- */

/**
 * A Stripe-hosted page for one of my own invoices (bank, card or Klarna); the caller
 * redirects the browser to `url`. Stripe returns to `/plugin-fees/statement?fee_pay=`.
 */
export function createInvoicePayLink(invoiceId: number): Promise<PayLinkResponse> {
  return postJson(`/me/invoices/${invoiceId}/pay-link/`);
}

export function fetchPayments(month: string, signal?: AbortSignal): Promise<PaymentsDashboard> {
  return getJson(`/payments/?month=${encodeURIComponent(month)}`, signal);
}

export function fetchFollowUps(
  status: FollowUpStatusFilter,
  signal?: AbortSignal
): Promise<FollowUp[]> {
  return getJson(`/follow-ups/?status=${encodeURIComponent(status)}`, signal);
}

export function resolveFollowUp(input: ResolveFollowUpInput): Promise<FollowUp> {
  return postJson(`/follow-ups/${input.id}/resolve/`, { note: input.note });
}

export function fetchBalances(signal?: AbortSignal): Promise<SmdBalance[]> {
  return getJson('/balances/', signal);
}

/** Sends the month's `draft` invoices now (normally automatic after approval). */
export function sendCycle(month: string): Promise<SendCycleResponse> {
  return postJson(`/cycles/${encodeURIComponent(month)}/send/`);
}
