/**
 * External ticket intake (BSCPro) — mirrors `ticket_intake` API payloads.
 * Backend: `/api/events/events/<eventId>/external-tickets/…`.
 */

export type ImportState =
  | 'queued'
  | 'validating'
  | 'preview_ready'
  | 'applying'
  | 'applied'
  | 'failed'
  | 'superseded'
  | 'historical';

export type MapRole = 'sponsor' | 'ticket_holder' | 'transfer_recipient';
export type MapState = 'unmatched' | 'provisional' | 'confirmed' | 'review' | 'ignored';
export type PlannedAction = 'create' | 'update' | 'unchanged' | '';
export type ChangeKind =
  | 'audit'
  | 'conflict'
  | 'mapping'
  | 'missing_source'
  | 'identity_hold'
  | 'legacy_history';

export interface Pagination {
  page: number;
  page_size: number;
  total: number;
}

export interface PreviewCounts {
  new: number;
  changed: number;
  unchanged: number;
  identity_review: number;
  onsite_conflicts: number;
  missing_review: number;
  field_review: number;
  unlinked_holders: number;
}

export interface ExternalImport {
  id: number;
  provider: string;
  event: number;
  filename: string;
  adapter_version: string;
  captured_at: string;
  uploaded_at: string;
  uploaded_by: number | null;
  coverage: 'unknown' | 'full' | 'partial';
  state: ImportState;
  revision: number;
  active_source_revision: number | null;
  heartbeat_at: string | null;
  applied_at: string | null;
  counts: {
    rows?: number;
    proposed_event_label?: string;
    historical?: boolean;
    preview?: PreviewCounts;
    preview_built_at?: string;
    applied?: Record<string, number>;
  };
  safe_error: string;
  created?: boolean;
}

export interface MapAccount {
  id: number;
  full_name: string;
  agency_code: string;
}

export interface AccountMap {
  id: number;
  role: MapRole;
  source_name: string;
  state: MapState;
  method: string;
  confidence: number;
  revision: number;
  warnings: string[];
  account: MapAccount | null;
}

export interface ImportRow {
  id: number;
  row_number: number;
  confirmation: string;
  original_holder: string;
  transfer_recipient: string;
  attendee: string;
  sponsor: string;
  quantity: number | null;
  planned_action: PlannedAction;
  maps: Record<MapRole, AccountMap | null>;
}

export interface RowChange {
  id: number;
  kind: ChangeKind;
  review_state: 'none' | 'open' | 'resolved';
  fields: string[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  reason: string;
  actor: number | null;
  created_at: string;
}

export interface ImportRowDetail extends ImportRow {
  source: Record<string, unknown>;
  raw_cells: string[];
  planned: Record<string, unknown>;
  ticket: {
    id: number;
    ticket_number: string;
    current: Record<string, unknown>;
    last_applied: Record<string, unknown>;
    admission_hold_reason: string;
    link_revision: number;
  } | null;
  history: RowChange[];
}

export interface SponsorRow {
  name: string;
  total: number;
  assigned: number;
  agents: number;
  residual: number;
  sponsor: AccountMap | null;
}

export interface SponsorSummary {
  total_tickets: number;
  assigned_tickets: number;
  assigned_agents: number;
  assigned_not_linked_agents: number;
  top_sponsor: string | null;
}

export interface ReviewItem {
  id: number;
  kind: ChangeKind;
  review_state: 'none' | 'open' | 'resolved';
  revision: number;
  confirmation: string;
  ticket: number | null;
  fields: string[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  reason: string;
  resolution: string;
  actor: number | null;
  created_at: string;
  resolved_at: string | null;
  import: number | null;
}

export interface AccountSearchHit {
  id: number;
  full_name: string;
  agency_code: string;
  email_hint: string;
  is_agent: boolean;
  is_active: boolean;
}

export interface RowFilters {
  action?: PlannedAction;
  state?: MapState | '';
  role?: MapRole | '';
  q?: string;
  page?: number;
}

export interface SponsorFilters {
  sort?: 'total' | 'assigned' | 'agents' | 'residual' | 'name';
  direction?: 'asc' | 'desc';
  q?: string;
  page?: number;
}

export interface DecidePayload {
  account_id: number | null;
  expected_revision: number;
  reason?: string;
  remember_alias?: boolean;
  scope?: 'single' | 'group';
  quick_confirm?: boolean;
}

export interface ResolvePayload {
  resolution: 'accept_source' | 'retain_staff' | 'reassign' | 'acknowledge';
  expected_revision: number;
  reason: string;
  account_id?: number | null;
}

export interface Paged<T> {
  rows: T[];
  pagination: Pagination;
}

// --- Emails to imported-ticket holders -------------------------------------

export type EmailTargetStatus = 'ready' | 'review' | 'missing' | 'unnamed';
export type EmailRunKind = 'preview' | 'test' | 'bulk' | 'retry';
export type EmailRunStatus = 'draft' | 'sending' | 'done' | 'cancelled' | 'discarded';
/** Our state, else the SendGrid-tracked status of the email. */
export type EmailOutcome =
  | 'planned' | 'cancelled' | 'skipped' | 'error'
  | 'queued' | 'sent' | 'delivered' | 'opened' | 'failed' | 'bounced';

export interface EmailLastSent {
  run: number;
  run_kind: EmailRunKind;
  address: string;
  outcome: EmailOutcome;
  at: string | null;
}

export interface EmailRecipientRow {
  ticket: number;
  ticket_number: string;
  confirmation: string;
  holder: string;
  address: string;
  address_source: string;
  status: EmailTargetStatus;
  reasons: string[];
  last_email: EmailLastSent | null;
}

export interface EmailRecipientSummary {
  tickets: number;
  ready: number;
  review: number;
  missing: number;
  unnamed: number;
  ready_recipients: number;
  pending_tickets: number;
  pending_recipients: number;
}

export interface EmailRecipientsPage extends Paged<EmailRecipientRow> {
  summary: EmailRecipientSummary;
  can_send: boolean;
  content_revision: string;
  test_done: boolean;
  test_max_recipients: number;
}

export interface EmailRecipientFilters {
  status?: EmailTargetStatus | '';
  search?: string;
  page?: number;
}

export interface EmailDelivery {
  id: number;
  address: string;
  first_name: string;
  address_source: string;
  state: string;
  outcome: EmailOutcome;
  error: string;
  queued_at: string | null;
  tickets: Array<{ id: number; number: string; holder: string }>;
  delivered_at: string | null;
  first_opened_at: string | null;
  bounce_reason: string;
}

export interface EmailRun {
  id: number;
  kind: EmailRunKind;
  status: EmailRunStatus;
  subject: string;
  recipient_count: number;
  ticket_count: number;
  excluded: Record<string, number>;
  content_revision: string;
  retry_of: number | null;
  created_by: string;
  created_at: string;
  confirmed_by: string;
  confirmed_at: string | null;
  finished_at: string | null;
  cancelled_by: string;
  cancelled_at: string | null;
  expires_at: string | null;
  counts: Partial<Record<EmailOutcome, number>>;
  /** Only on a freshly prepared draft. */
  sample?: EmailDelivery[];
}

export interface EmailPreview {
  to: string;
  subject: string;
  tickets: number;
  html: string;
}

// --- Partner transactions exports (price and payment per purchase) -----------

export type TransactionAction = 'new' | 'changed' | 'unchanged' | 'unmatched';

export interface TransactionCounts {
  rows: number;
  new: number;
  changed: number;
  unchanged: number;
  /** Invoices with no imported purchase in this event; never applied to another order. */
  unmatched: number;
  matched_total: string;
  unmatched_total: string;
}

export interface TransactionImport {
  id: number;
  provider: string;
  event: number;
  filename: string;
  captured_at: string;
  uploaded_at: string;
  uploaded_by: number | null;
  state: 'preview_ready' | 'applied';
  applied_at: string | null;
  applied_by: number | null;
  counts: { preview?: TransactionCounts; applied?: TransactionCounts & { created: number; updated: number } };
  /** `false` when the same bytes were uploaded before (upload response only). */
  created?: boolean;
}

export interface TransactionRow {
  id: number;
  row_number: number;
  invoice: string;
  action: TransactionAction;
  /** The matched WB order, or `null` when unmatched. */
  order: number | null;
  provider_purchase_id: string;
  payment_method: string;
  processor_transaction_id: string;
  first_name: string;
  last_name: string;
  email: string;
  quantity: number;
  unit_price: string;
  total: string;
  paid_at: string;
}

// --- Scheduled fetch of the partner's exports --------------------------------

export type FetchStatus = 'queued' | 'running' | 'succeeded' | 'no_change' | 'needs_review' | 'failed';
export type FetchStepStatus = 'pending' | 'running' | 'ok' | 'failed' | 'skipped';

export interface FetchConfig {
  provider: string;
  /** The partner's own event number (BSCPro `1550`); a file for another event is refused. */
  external_event_id: string;
  /** The event's name exactly as the partner lists it; the browser picks the event by this text. */
  external_event_name: string;
  /** Off until someone turns it on; the server also turns it off after repeated failures. */
  enabled: boolean;
  /** Failed runs in a row. */
  consecutive_failures: number;
  /** Why the server switched the schedule off, or `''`. */
  paused_reason: string;
  interval_minutes: number;
  /** A random moment inside the next interval window; `null` while disabled. */
  next_run_at: string | null;
  updated_at: string;
  updated_by: number | null;
}

export interface FetchConfigResponse {
  /** `null` until a schedule is saved for the event. */
  config: FetchConfig | null;
  intervals: number[];
  /** `false`: this deployment fetches only on "Run now"; the schedule controls are hidden. Absent on older servers. */
  schedule_available?: boolean;
}

export interface FetchStep {
  key: string;
  label: string;
  status: FetchStepStatus;
  detail: string;
  started_at?: string;
  finished_at?: string;
}

export interface FetchRun {
  id: number;
  provider: string;
  trigger: 'schedule' | 'manual';
  status: FetchStatus;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  steps: FetchStep[];
  /** Absent keys mean that part did not run (e.g. tickets unchanged). */
  counts: {
    tickets?: {
      created?: number;
      updated?: number;
      unchanged?: number;
      transferred?: number;
      renamed?: number;
      contact_changed?: number;
      conflicts?: number;
      holds?: number;
      missing_review?: number;
    };
    transactions?: { new: number; changed: number; unmatched: number };
  };
  error: string;
  ticket_import: number | null;
  transaction_import: number | null;
}
