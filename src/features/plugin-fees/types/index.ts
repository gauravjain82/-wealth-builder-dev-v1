/**
 * Wire types for the plug-in fees P2, P3 and P4 surfaces.
 *
 * These mirror the backend contract field for field:
 * `mlm_platform/docs/plugin_fees/API.md` (summarised in `docs/plugin-fees/API.md` §3).
 * A field the viewer may not see is **absent**, never `null`, so optional keys below are
 * `?:`, and keys the contract says may be null are `| null`.
 */

/* --- access --------------------------------------------------------------- */

/** `GET /api/plugin-fees/my-access/` */
export interface PluginFeesAccess {
  level_code: string | null;
  is_billable: boolean;
  can_submit_office: boolean;
  can_submit_assistant: boolean;
  can_save_payment_method: boolean;
  can_review: boolean;
  can_manage: boolean;
  can_approve_payouts: boolean;
}

/* --- shared pieces -------------------------------------------------------- */

/**
 * A stored upload. `url` is signed and expires after 15 minutes — refetch, never cache.
 * `null` when the backend could not sign a URL (storage unavailable).
 */
export interface PluginFeesFile {
  name: string;
  mime: string;
  url: string | null;
}

export type SubmissionActionKind = string;

/** One audit row on a submission: who did what, when. */
export interface SubmissionAction {
  action: SubmissionActionKind;
  /** `null` for scheduled-job actions (re-verification opened, expired). */
  actor: string | null;
  note: string;
  at: string;
}

export type OfficeStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'superseded';

export type AssistantStatus =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'expired'
  | 'withdrawn'
  | 'superseded';

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** `start` and `end` are `HH:MM`, 24-hour, `start < end`. */
export interface AssistantHours {
  day: Weekday;
  start: string;
  end: string;
}

/* --- submissions ---------------------------------------------------------- */

export interface OfficeSubmission {
  id: number;
  status: OfficeStatus;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
  lease?: PluginFeesFile;
  photo?: PluginFeesFile;
  submitted_at: string;
  decided_at: string | null;
  decided_by: string | null;
  decision_note: string;
  actions: SubmissionAction[];
}

export interface AssistantSubmission {
  id: number;
  status: AssistantStatus;
  name: string;
  phone: string;
  email: string;
  hours: AssistantHours[];
  photo?: PluginFeesFile;
  submitted_at: string;
  decided_at: string | null;
  decided_by: string | null;
  decision_note: string;
  verified_at: string | null;
  /** `YYYY-MM-DD` */
  reverify_due: string | null;
  reverify_open: boolean;
  actions: SubmissionAction[];
}

export interface SubmissionGroup<T> {
  effective: T | null;
  pending: T | null;
  history: T[];
}

/* --- the agent's own section --------------------------------------------- */

export type PaymentMethodType = 'us_bank_account' | 'card';

/**
 * How the agent pays (D19b): `automatic` charges the saved method on the 1st;
 * `self_pay` sends a payment link (bank, card or Klarna) due by `self_pay_due_day`.
 */
export type PaymentPreference = 'automatic' | 'self_pay';

/**
 * `saved` = verified and chargeable. `pending_verification` = a bank account waiting on
 * micro-deposits (not chargeable yet). `failed` = Stripe could not verify it.
 * `type` / `label` are present for every status except `none`; `saved_at` only for `saved`.
 */
export interface PluginFeesPaymentMethod {
  status: 'none' | 'pending_verification' | 'saved' | 'failed';
  preference: PaymentPreference;
  self_pay_due_day: number;
  type?: PaymentMethodType;
  label?: string;
  saved_at?: string;
}

export interface PluginFeesRates {
  with_office_cents: number;
  without_office_cents: number;
  /** `YYYY-MM` — the cycle these rates apply to. */
  month: string;
}

/** `GET /api/plugin-fees/me/` */
export interface PluginFeesMe {
  level_code: string | null;
  /** Absent for a user who may not submit an office. */
  office?: SubmissionGroup<OfficeSubmission>;
  /** Absent for a user who may not submit an assistant. */
  assistant?: SubmissionGroup<AssistantSubmission>;
  /** Absent for a user who does not pay plug-in fees (not an active MD or SMD). */
  payment_method?: PluginFeesPaymentMethod;
  deadlines: {
    /** `YYYY-MM-DD` */
    assistant_verification?: string;
  };
  /** Absent when no price is configured for this level. */
  rates?: PluginFeesRates;
}

export interface OfficeSubmissionInput {
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
  lease: File;
  photo: File;
}

export interface AssistantSubmissionInput {
  name: string;
  phone: string;
  email: string;
  hours: AssistantHours[];
  photo: File;
}

/** `POST /api/plugin-fees/me/payment-method/setup-session/` */
export interface SetupSessionResponse {
  url: string;
}

/* --- review queues -------------------------------------------------------- */

export interface ReviewAgent {
  id: number;
  name: string;
  agency_code: string | null;
  level_code: string | null;
  email?: string;
}

export type OfficeReviewItem = OfficeSubmission & { agent: ReviewAgent };
export type AssistantReviewItem = AssistantSubmission & { agent: ReviewAgent };

/** DRF page envelope, 25 per page. */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type OfficeReviewStatus = 'pending' | 'approved' | 'rejected' | 'all';
export type AssistantReviewStatus =
  | 'pending'
  | 'reverify_due'
  | 'verified'
  | 'rejected'
  | 'expired'
  | 'all';

export type ReviewKind = 'offices' | 'assistants';

export interface ReviewQuery<S extends string> {
  status: S;
  search: string;
  page: number;
}

export type OfficeDecision = 'approve' | 'reject';
export type AssistantDecision = 'verify' | 'reject';

export interface DecisionInput<D extends string> {
  id: number;
  decision: D;
  note: string;
}

/* --- P3: statements (contract §5) ----------------------------------------- */

/** An invoice or ledger line. Credits are negative on an invoice; the lines sum to the total. */
export interface StatementLine {
  label: string;
  amount_cents: number;
}

/**
 * Contract §6 vocabulary: `draft` = generated, not yet sent; `no_charge` = nothing to
 * pay this month; `open` = sent (automatic: awaiting the first charge or a retry;
 * self-pay: awaiting the agent); `processing` = a bank (ACH) payment in flight, settles
 * in ~4 business days; `paid`; `failed` = retries exhausted or a payment reversed (the
 * agent can still pay now); `void`.
 */
export type InvoiceStatus =
  | 'draft'
  | 'no_charge'
  | 'open'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'void';

/** P4: how an invoice is collected (D19b). */
export type CollectionMode = 'automatic' | 'self_pay';

/** P4: what settled an invoice. `klarna` is only ever the agent's own choice (D19). */
export type PaidVia = 'automatic' | 'retry' | 'self_pay' | 'pay_now' | 'klarna';

/** P4: the most recent failed charge. `code` is Stripe's decline / failure code. */
export interface PaymentFailure {
  code: string;
  message: string;
  at: string;
}

/**
 * The P4 collection fields (contract §6). Shared by statement invoices and the
 * payments dashboard rows, so one component renders the payment state for both.
 */
export interface InvoicePaymentState {
  status: InvoiceStatus;
  collection: CollectionMode;
  /** `YYYY-MM-DD`; self-pay invoices only. */
  due_date: string | null;
  attempts: number;
  /** `YYYY-MM-DD` of the next automatic retry. */
  next_retry_on: string | null;
  /** `null` when nothing has failed. */
  last_failure: PaymentFailure | null;
  paid_at: string | null;
  paid_via: PaidVia | null;
}

export type InvoiceKind = 'SMD' | 'MD';

export interface StatementInvoice extends InvoicePaymentState {
  id: number;
  /** `YYYY-MM` — the billing month. */
  month: string;
  kind: InvoiceKind;
  amount_cents: number;
  /** Always sums to `amount_cents`. */
  lines: StatementLine[];
  paid_cents: number;
  /**
   * P4: true for an `open` or `failed` invoice with an amount; false for an automatic
   * invoice still before its first charge.
   */
  can_pay_now: boolean;
}

export type LedgerEntryType =
  | 'md_credit_own'
  | 'md_credit_rollup'
  | 'smd_fee'
  | 'costs'
  | 'charge_collected'
  | 'payout'
  | 'reversal'
  | 'adjustment';

export interface LedgerEntry {
  id: number;
  posted_at: string;
  type: LedgerEntryType;
  label: string;
  memo: string;
  /** Credits positive, debits negative. */
  amount_cents: number;
  /** `YYYY-MM` — the billing month the entry belongs to (a late payment keeps its month). */
  month: string;
  /** Running balance after this entry. */
  balance_cents: number;
}

export interface StatementLedger {
  /** Positive: owed to the SMD (paid out quarterly). Negative: the SMD owes. */
  balance_cents: number;
  entries: LedgerEntry[];
}

/** `GET /api/plugin-fees/me/statement/` */
export interface PluginFeesStatement {
  invoices: StatementInvoice[];
  /** Present for SMDs (and anyone with ledger entries); absent for MDs. */
  ledger?: StatementLedger;
}

/** `GET /api/plugin-fees/agents/{id}/statement/` */
export interface AgentStatement extends PluginFeesStatement {
  agent: ReviewAgent;
}

/* --- P3: billing cycles ---------------------------------------------------- */

export type CycleStatus = 'generating' | 'generated' | 'approved';

/** One row of `GET /api/plugin-fees/cycles/`, newest first. */
export interface CycleSummary {
  month: string;
  status: CycleStatus;
  requires_approval: boolean;
  generated_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
}

export type CycleReportStatus = 'preview' | 'generated' | 'approved';

export interface CycleTotals {
  agents_billed: number;
  agents_excluded: number;
  md_count: number;
  smd_count: number;
  md_charges_cents: number;
  smd_charges_cents: number;
  no_charge_count: number;
  self_pay_count: number;
  /** Charged automatically on the 1st but no verified method to charge. Chase them. */
  automatic_without_verified_method: number;
}

export interface SevcTotal {
  sevc_id: number;
  sevc_name: string | null;
  smd_fees_cents: number;
  costs_cents: number;
}

/** The contract lists `draft | no_charge | excluded | …`; invoice statuses may follow. */
export type CycleAgentStatus = InvoiceStatus | 'excluded';

export type CycleMethodStatus = 'none' | 'pending_verification' | 'verified' | 'failed';

export interface CycleAgent {
  user_id: number;
  name: string;
  agency_code: string | null;
  level_code: string | null;
  office_approved: boolean;
  /** `null` for MDs. */
  assistant_verified: boolean | null;
  fee_cents: number;
  costs_cents: number;
  amount_cents: number;
  lines: StatementLine[];
  status: CycleAgentStatus;
  closest_sevc_id: number | null;
  closest_sevc_name: string | null;
  /** MDs only: where this MD's fee is credited. */
  md_credit_kind: 'SMD' | 'SEVC' | null;
  md_credit_recipient_id: number | null;
  md_credit_recipient_name: string | null;
  /** True when the fee passed over an SMD without a verified assistant. */
  md_rolled_up: boolean;
  preference: PaymentPreference;
  method_status: CycleMethodStatus;
  /** `no_sevc`: a billable-level agent with no SEVC on their recruiting line — not billed. */
  excluded_reason: 'no_sevc' | null;
  invoice_id: number | null;
}

/** `GET cycles/{month}/` and `GET cycles/preview/?month=` (status `preview`). */
export interface CycleReport {
  month: string;
  status: CycleReportStatus;
  requires_approval: boolean;
  approved_by: string | null;
  approved_at: string | null;
  snapshot_digest: string;
  totals: CycleTotals;
  sevc_totals: SevcTotal[];
  agents: CycleAgent[];
  /**
   * P4: sending progress, the same block as `payments/`. Typed optional: the contract
   * adds it to the report without saying whether a preview carries it.
   */
  sending?: SendingProgress;
}

export interface ApproveCycleInput {
  month: string;
  note: string;
}

/* --- P3: recognition and mailing costs ------------------------------------ */

export interface RecognitionCost {
  id: number;
  smd: ReviewAgent;
  recipient_id: number | null;
  recipient_name: string;
  item: string;
  recognition_cents: number;
  mailing_cents: number;
  total_cents: number;
  /** `YYYY-MM-DD` */
  date_sent: string;
  note: string;
  logged_by: string;
  /** `YYYY-MM` of the cycle that netted it (the month after `date_sent`); `null` until then. */
  applied_month: string | null;
}

export interface CostsQuery {
  smd: number | null;
  /** `YYYY-MM` filter on `date_sent`, or `''` for all. */
  month: string;
  page: number;
}

export interface CostInput {
  smd_id: number;
  recipient_id?: number;
  recipient_name: string;
  item: string;
  recognition_cents: number;
  mailing_cents?: number;
  date_sent: string;
  note?: string;
}

export interface DeleteCostInput {
  id: number;
  reason: string;
}

/* --- P4: collection ------------------------------------------------------- */

/** `POST me/invoices/{id}/pay-link/` — a Stripe-hosted page for this one invoice. */
export interface PayLinkResponse {
  url: string;
}

/** How many of a month's invoices have been sent to Stripe. */
export interface SendingProgress {
  total: number;
  sent: number;
  pending: number;
}

export interface PaymentCounts {
  paid: number;
  processing: number;
  /** Automatic, sent, before the first charge. */
  open_automatic: number;
  /** Automatic invoices with `attempts >= 1` that are still `open`. */
  retrying: number;
  self_pay_open: number;
  /** Self-pay invoices past `due_date`, not paid. */
  self_pay_overdue: number;
  failed: number;
  no_charge: number;
}

export interface PaymentTotals {
  invoiced_cents: number;
  paid_cents: number;
  outstanding_cents: number;
  counts: PaymentCounts;
}

/** One sent invoice of the month (`no_charge` excluded). */
export interface PaymentRow extends InvoicePaymentState {
  invoice_id: number;
  agent: ReviewAgent;
  kind: InvoiceKind;
  amount_cents: number;
  /** Self-pay, open and past `due_date` (UTC). Computed by the backend (contract §6.1). */
  overdue: boolean;
  follow_up_open: boolean;
}

/** `GET payments/?month=YYYY-MM` */
export interface PaymentsDashboard {
  month: string;
  /** `null` when no cycle exists for the month. */
  cycle_status: 'generated' | 'approved' | null;
  sending: SendingProgress;
  totals: PaymentTotals;
  klarna: { count: number; paid_cents: number };
  rows: PaymentRow[];
}

export type FollowUpReason = 'retries_exhausted' | 'self_pay_overdue';

export type FollowUpStatusFilter = 'open' | 'resolved' | 'all';

/** `GET follow-ups/?status=` */
export interface FollowUp {
  id: number;
  invoice_id: number;
  agent: ReviewAgent;
  /** `YYYY-MM` */
  month: string;
  amount_cents: number;
  reason: FollowUpReason;
  opened_at: string;
  resolved_at: string | null;
  /** The resolver's name; `null` while open, or when it resolved itself on payment. */
  resolved_by: string | null;
  /** The resolution note; says so when the follow-up resolved itself on payment. */
  note: string;
}

export interface ResolveFollowUpInput {
  id: number;
  note: string;
}

/** One row of `GET balances/`, highest first. Positive: owed to the SMD. */
export interface SmdBalance {
  agent: ReviewAgent;
  balance_cents: number;
}

/** `POST cycles/{month}/send/` */
export interface SendCycleResponse {
  queued: boolean;
}

/* --- errors --------------------------------------------------------------- */

/** The stable `code`s the P2/P3 contract documents. Unknown codes are passed through. */
export type PluginFeesErrorCode =
  | 'validation_error'
  | 'file_type_invalid'
  | 'file_size_invalid'
  | 'already_pending'
  | 'not_eligible'
  | 'not_withdrawable'
  | 'stripe_unavailable'
  | 'forbidden'
  | 'note_required'
  | 'not_pending'
  | 'not_decidable'
  | 'not_awaiting_approval'
  | 'not_found'
  | 'already_applied'
  | 'not_payable'
  | 'already_resolved'
  | 'not_approved';
