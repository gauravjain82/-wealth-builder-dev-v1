/**
 * Wire types for the plug-in fees P2–P6 surfaces.
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
  /** An active SMD: a verified assistant makes MD fees reach them. False for every other
   * level that may submit an assistant — theirs is recorded and changes no fee. */
  assistant_counts_for_routing: boolean;
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

/**
 * Lifetime sums of the ledger by entry type, signed like the entries (credits positive,
 * debits negative). Added with the fee configuration work (2026-10-03).
 */
export type LedgerTotals = Record<LedgerEntryType, number>;

export interface StatementLedger {
  /** Positive: owed to the SMD (paid out quarterly). Negative: the SMD owes. */
  balance_cents: number;
  entries: LedgerEntry[];
  /** Absent from payloads served before the fee configuration work — guard for it. */
  totals?: LedgerTotals;
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

/* --- P5: Stripe Connect and quarterly payouts (contract §7) ---------------- */

/**
 * `none` no account · `onboarding` started, details not submitted · `restricted`
 * submitted, Stripe needs more / payouts not enabled · `enabled` ready for transfers.
 */
export type ConnectStatus = 'none' | 'onboarding' | 'restricted' | 'enabled';

/** `GET me/connect/` — active SMDs only (others `403 not_eligible`). */
export interface ConnectAccount {
  status: ConnectStatus;
  /** Stripe requirement paths, e.g. `individual.verification.document`. */
  requirements_due: string[];
  updated_at: string | null;
  /** The SMD's current ledger balance; positive is owed to them. */
  balance_cents: number;
}

/** `POST me/connect/onboarding-link/` */
export interface OnboardingLinkResponse {
  url: string;
}

/** `YYYY-Qn`, e.g. `2026-Q4`. */
export type QuarterValue = string;

export type PayoutStatus = 'draft' | 'approved' | 'sending' | 'sent' | 'partial';

/** One row of `GET payouts/`, newest first. */
export interface PayoutSummary {
  quarter: QuarterValue;
  /** `YYYY-MM-DD` */
  period_end: string;
  status: PayoutStatus;
  total_cents: number;
  /** Count of lines (SMDs with a positive balance at `period_end`). */
  lines: number;
  held: number;
  failed: number;
  approved_by: string | null;
  approved_at: string | null;
}

export interface PayoutTotals {
  total_cents: number;
  payable_cents: number;
  held_cents: number;
  sent_cents: number;
  failed_cents: number;
  lines: number;
  held: number;
  failed: number;
}

export type PayoutLineStatus = 'pending' | 'held_no_connect' | 'sent' | 'failed';

/** A ledger entry behind a payout line (entries posted in the quarter). */
export interface PayoutEntry {
  posted_at: string;
  type: LedgerEntryType;
  label: string;
  memo: string;
  amount_cents: number;
  /** `YYYY-MM` */
  month: string;
}

/**
 * Why a transfer failed. The contract shows only `"failure": null`; it is typed to accept
 * either a message string or the `{code, message}` shape the P4 failures use.
 */
export type PayoutFailure = string | { code?: string; message?: string; at?: string };

export interface PayoutLine {
  id: number;
  agent: ReviewAgent;
  /** The SMD's ledger balance as of `period_end` 23:59:59 UTC. */
  amount_cents: number;
  /**
   * Ledger balance at the start of the quarter (contract §7.1):
   * `opening_balance_cents + Σ entries.amount_cents === amount_cents`.
   */
  opening_balance_cents: number;
  status: PayoutLineStatus;
  connect_status: ConnectStatus;
  stripe_transfer_id: string | null;
  failure: PayoutFailure | null;
  sent_at: string | null;
  entries: PayoutEntry[];
}

/** `GET payouts/{quarter}/` */
export interface PayoutReport {
  quarter: QuarterValue;
  period_end: string;
  status: PayoutStatus;
  approved_by: string | null;
  approved_at: string | null;
  note: string;
  totals: PayoutTotals;
  lines: PayoutLine[];
}

export interface ApprovePayoutInput {
  quarter: QuarterValue;
  note: string;
}

export interface RetryPayoutLineInput {
  quarter: QuarterValue;
  lineId: number;
}

/* --- P6: admin dashboard remainder (contract §8) --------------------------- */

export interface DashboardSevcTotal {
  sevc_id: number;
  sevc_name: string | null;
  smd_fees_cents: number;
  costs_cents: number;
  /** MD fees with no SMD assistant on the line, routed to the SEVC. */
  md_unrouted_cents: number;
}

export interface UpcomingPayout {
  quarter: QuarterValue;
  period_end: string;
  positive_balances_cents: number;
  smds: number;
  not_onboarded: number;
}

export interface ConnectNotOnboarded {
  agent: ReviewAgent;
  status: Exclude<ConnectStatus, 'enabled'>;
  balance_cents: number;
}

/** `GET dashboard/` */
export interface PluginFeesDashboard {
  /** `YYYY-MM` */
  month: string;
  payments: {
    counts: {
      paid: number;
      processing: number;
      retrying: number;
      self_pay_overdue: number;
      failed: number;
    };
    outstanding_cents: number;
    klarna_count: number;
  };
  follow_ups_open: number;
  verifications: {
    offices_pending: number;
    assistants_pending: number;
    assistants_reverify_due: number;
    /** Verified with `reverify_due` within 14 days. */
    assistants_expiring_14d: number;
  };
  costs_this_month_cents: number;
  sevc_totals_this_month: DashboardSevcTotal[];
  upcoming_payout: UpcomingPayout;
  connect_not_onboarded: ConnectNotOnboarded[];
}

/** One row of `GET sevc-totals/?from=&to=`, net of reversals. */
export interface SevcMonthTotal extends DashboardSevcTotal {
  /** `YYYY-MM` */
  month: string;
  total_cents: number;
}

export interface SevcTotalsRange {
  /** `YYYY-MM` */
  from: string;
  /** `YYYY-MM` */
  to: string;
}

/** One row of `GET adjustments/` (paginated). Never edited or deleted. */
export interface LedgerAdjustment {
  id: number;
  agent: ReviewAgent;
  /** Signed: positive credits the SMD, negative debits. */
  amount_cents: number;
  note: string;
  invoice_id: number | null;
  created_by: string | null;
  created_at: string;
}

export interface AdjustmentsQuery {
  smd: number | null;
  page: number;
}

/** `POST adjustments/` */
export interface AdjustmentInput {
  smd_id: number;
  /** Signed, non-zero integer cents. */
  amount_cents: number;
  note: string;
  invoice_id?: number;
}

/** `POST invoices/{id}/void/` */
export interface VoidInvoiceInput {
  id: number;
  note: string;
}

/* --- fee configuration (2026-10-03) ---------------------------------------- */

/** The billed levels; the fee schedule prices each with and without an approved office. */
export type FeeLevelCode = 'MD' | 'SMD';

/** One effective-dated price. Never changes once `started` (in force). */
export interface FeeRate {
  id: number;
  level_code: FeeLevelCode;
  with_office: boolean;
  amount_cents: number;
  /** `YYYY-MM-DD`, always the 1st of a month. */
  effective_from: string;
  note: string;
  /** True once `effective_from` is today or past: the price is (or was) in force. */
  started: boolean;
  created_by_name: string | null;
  created_at: string | null;
}

/** One cell of the 2×2 fee table (MD/SMD × with/without office). */
export interface FeeMatrixCell {
  level_code: FeeLevelCode;
  with_office: boolean;
  current: FeeRate | null;
  /** The price the next cycle will use. */
  next_cycle: FeeRate | null;
  /** Future prices, not yet in force. */
  scheduled: FeeRate[];
}

/** `GET fee-schedule/`; also the body of a successful POST or DELETE. */
export interface FeeSchedule {
  /** `YYYY-MM-DD` */
  today: string;
  /** `YYYY-MM` */
  next_cycle_month: string;
  /** `YYYY-MM-DD` — the earliest 1st of a month a new price may start on. */
  earliest_effective_from: string;
  billed_levels: FeeLevelCode[];
  matrix: FeeMatrixCell[];
  /** Full history, newest `effective_from` first. */
  rows: FeeRate[];
}

export interface FeeRateInput {
  level_code: FeeLevelCode;
  with_office: boolean;
  amount_cents: number;
}

/** `POST fee-schedule/`. Rates left out keep their price; a same-date schedule is replaced. */
export interface ScheduleFeeChangeInput {
  /** `YYYY-MM` or `YYYY-MM-01` */
  effective_from: string;
  reason: string;
  rates: FeeRateInput[];
}

/** `DELETE fee-schedule/{id}/` — only a rate that has not started. */
export interface DeleteFeeRateInput {
  id: number;
  reason: string;
}

/** An `accounts.Level` row, as the settings screen shows it. */
export interface PluginFeesLevel {
  id: number;
  code: string;
  name: string | null;
  rank: number;
}

/** `GET settings/` */
export interface PluginFeesBillingSettings {
  /** `YYYY-MM` */
  go_live_month: string | null;
  self_pay_due_day: number;
  reverify_window_days: number;
  /** `YYYY-MM-DD` */
  assistant_verification_deadline: string | null;
  /** The configured lowest level that may submit an office and an assistant; `null` = default. */
  submission_min_level: PluginFeesLevel | null;
  /** The level in effect (the default when unset); `null` if none exists. */
  submission_min_level_effective: PluginFeesLevel | null;
  /** The default used while unset (the level coded `MD`); `null` if there is none. */
  submission_min_level_default: PluginFeesLevel | null;
  /** Every level, lowest rank first. Optional: absent from a backend without D21. */
  level_options?: PluginFeesLevel[];
  /** True once any cycle is approved: the go-live month can no longer move. */
  go_live_locked: boolean;
  updated_at: string | null;
}

/** `PATCH settings/`: a required reason plus only the fields that changed. */
export interface UpdateBillingSettingsInput {
  reason: string;
  go_live_month?: string | null;
  self_pay_due_day?: number;
  reverify_window_days?: number;
  assistant_verification_deadline?: string | null;
  /** A level id, or `null` to return to the default. */
  submission_min_level?: number | null;
}

export type ConfigHistoryObject = 'fee' | 'settings';
export type ConfigHistoryAction = 'create' | 'update' | 'delete';

/** One row of `GET config-history/` (newest first, at most 50). */
export interface ConfigHistoryEntry {
  id: number;
  at: string;
  object: ConfigHistoryObject;
  object_repr: string;
  action: ConfigHistoryAction;
  actor_name: string | null;
  source: string | null;
  reason: string;
  changes: Record<string, { old: unknown; new: unknown }>;
}

export interface ConfigHistory {
  results: ConfigHistoryEntry[];
}

/* --- errors --------------------------------------------------------------- */

/** The stable `code`s the P2–P6 contract documents. Unknown codes are passed through. */
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
  | 'not_approved'
  | 'quarter_not_ended'
  | 'not_draft'
  | 'not_retryable'
  | 'not_voidable'
  | 'reason_required'
  | 'effective_from_not_future'
  | 'cycle_exists'
  | 'conflict'
  | 'rate_started'
  | 'go_live_locked';
