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
