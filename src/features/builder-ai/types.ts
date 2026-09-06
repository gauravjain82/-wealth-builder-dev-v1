/**
 * Builder AI — shared TypeScript contracts.
 *
 * These interfaces mirror the Django `builder` app's read payloads 1:1 (Phase 2
 * dashboard/roster/timeseries/breakdown + Phase 1 BuilderInvitation lifecycle).
 * Keeping them in one module is the single source of truth for the feature's data
 * shapes (Decision 24 — no `any` on API boundaries).
 *
 * Backend references:
 *   - builder/services/dashboard.py  (dashboard/roster/timeseries/breakdown)
 *   - builder/serializers.py         (program/period/profile/invitation)
 */

// --------------------------------------------------------------------------- //
// Segments & scopes
// --------------------------------------------------------------------------- //

/**
 * The four viewer-facing dashboard segment tiers (Decision 31). Sent as the `?scope=`
 * query param; the backend maps them 1:1 to builder segments
 * (individual→INDIVIDUAL, baseshop→BASESHOP, superbase→SUPERBASE, superteam→SUPERTEAM)
 * and clamps ungranted super tiers to baseshop. This is a builder *segment* (cumulative
 * BaseShop ⊆ SuperBase ⊆ SuperTeam), NOT an authz access scope.
 */
export type DashboardScope = 'individual' | 'baseshop' | 'superbase' | 'superteam';

/**
 * One entry in the dashboard segment toggle, as resolved by the backend
 * (`DashboardPayload.segments`). `key` is the `?scope=` value, `label` is the
 * program-configured display name (e.g. SuperTeam → "Company"), and `locked` is
 * true when the viewer lacks the grant for that tier (render disabled/hidden).
 */
export interface SegmentOption {
  key: DashboardScope;
  label: string;
  locked: boolean;
}

/** Builder membership status for the selected period (marathon split, Decision 6). */
export type BuilderStatus = 'ACTIVE' | 'COMPLETED' | 'REMOVED' | 'INVITED' | 'SUSPENDED' | 'TERMINATED';

/** BuilderInvitation lifecycle states. */
export type InvitationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'CANCELLED';

// --------------------------------------------------------------------------- //
// Identity
// --------------------------------------------------------------------------- //

/** Compact user reference embedded in profiles/invitations (UserBriefSerializer). */
export interface UserBrief {
  id: number;
  username: string;
  full_name: string | null;
  agency_code: string | null;
  level_code: string | null;
}

// --------------------------------------------------------------------------- //
// Programs & periods
// --------------------------------------------------------------------------- //

export interface BuilderProgram {
  id: number;
  name: string;
  code: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  start_date: string | null;
  timezone: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PerformancePeriod {
  id: number;
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
  start_date: string;
  end_date: string;
  status: 'OPEN' | 'CLOSED';
}

/** Fields accepted by `POST/PATCH /api/builder/programs/`. `code` is the stable key. */
export interface BuilderProgramWriteInput {
  name: string;
  code: string;
  status?: BuilderProgram['status'];
  start_date?: string | null;
  timezone?: string;
  /**
   * Free-form program config (JSON). Holds `segment_labels` — the display names for
   * the dashboard toggle tiers (e.g. `{ SUPERTEAM: "Company" }`, Decision 31). PATCH
   * replaces the whole object, so callers spread the existing config before editing.
   */
  config?: Record<string, unknown>;
}

/** Canonical segment keys whose display labels are program-configurable (Decision 31). */
export const SEGMENT_LABEL_FIELDS: { key: string; fallback: string }[] = [
  { key: 'INDIVIDUAL', fallback: 'Individual' },
  { key: 'BASESHOP', fallback: 'BaseShop' },
  { key: 'SUPERBASE', fallback: 'SuperBase' },
  { key: 'SUPERTEAM', fallback: 'SuperTeam' },
];

/**
 * The caller's Builder capability flags from `GET /api/builder/my-access/`. Drives
 * frontend menu gating (the backend still enforces every check server-side).
 */
export interface MyBuilderAccess {
  program: { read: boolean; manage: boolean };
  dashboard: { read: boolean; manage: boolean };
  invitation: { read: boolean; create: boolean };
  profile: { read: boolean };
}

// --------------------------------------------------------------------------- //
// Metric display config (drives per-metric colour/icon — Decision 28)
// --------------------------------------------------------------------------- //

/** JSON `display` blob on a MetricDefinition: colour token, icon, sort order. */
export interface MetricDisplay {
  color?: string;
  icon?: string;
  order?: number;
  [key: string]: unknown;
}

export interface MetricRef {
  code: string;
  name: string;
  display: MetricDisplay;
  unit?: string;
}

// --------------------------------------------------------------------------- //
// Dashboard (config-driven sections of widgets)
// --------------------------------------------------------------------------- //

/** Widget renderer keys — map to a component in the WidgetFactory (Decision 29 OCP). */
export type WidgetType =
  | 'stat_sparkline'
  | 'progress_ring'
  | 'trend'
  | 'composition'
  | 'ranking'
  | 'compare'
  | 'org_heat'
  | 'heatmap'
  | 'roster';

/** One widget's assembled payload (value/target/pct already resolved server-side). */
export interface WidgetPayload {
  type: WidgetType | string;
  title: string;
  scope: string;
  config: Record<string, unknown>;
  color_rule: Record<string, unknown>;
  order: number;
  metric?: MetricRef;
  /** Uncapped current value (headers never cap — Decision 23). */
  current?: number;
  /** Resolved goal target, or null when the metric has no goal. */
  target?: number | null;
  /** Uncapped percentage (current/target*100) — for header cards. */
  pct?: number | null;
  /** Capped percentage — for rings/bars honouring `display_cap_100`. */
  capped_pct?: number;
  display_cap_100?: boolean;
}

export interface DashboardSection {
  title: string;
  order: number;
  widgets: WidgetPayload[];
}

export interface DashboardPayload {
  scope: string;
  /** Role-gated toggle tiers with configurable labels (Decision 31). */
  segments: SegmentOption[];
  period: PerformancePeriod;
  as_of: string | null;
  sections: DashboardSection[];
}

// --------------------------------------------------------------------------- //
// Roster (one row per visible builder)
// --------------------------------------------------------------------------- //

/** A per-metric progress cell on a roster row (horizontal bar). */
export interface RosterMetricCell {
  code: string;
  current: number;
  display: MetricDisplay;
  target?: number;
  /** Uncapped percentage. */
  pct?: number;
  /** Capped percentage (honours the goal's `display_cap_100`). */
  capped_pct?: number;
}

export interface RosterRow {
  builder_id: number;
  user_id: number;
  name: string;
  agency_code: string | null;
  level_code: string | null;
  avatar: string;
  status: BuilderStatus;
  is_company_owner: boolean;
  /** Mean of the row's capped metric percentages (the attainment ring). */
  attainment_pct: number;
  metrics: RosterMetricCell[];
}

export interface RosterPayload {
  scope: string;
  period: PerformancePeriod;
  as_of: string | null;
  metrics: MetricRef[];
  rows: RosterRow[];
}

// --------------------------------------------------------------------------- //
// Timeseries & breakdown (charts — Reporting)
// --------------------------------------------------------------------------- //

export interface TimeseriesPoint {
  period_id: number;
  start_date: string;
  end_date: string;
  value: number;
}

export interface TimeseriesPayload {
  metric: string;
  scope: string;
  series: TimeseriesPoint[];
}

export type BreakdownGroupBy = 'status' | 'level' | 'member';

export interface BreakdownGroup {
  key: string;
  value: number;
  count: number;
}

export interface BreakdownPayload {
  metric: string;
  scope: string;
  group_by: BreakdownGroupBy;
  groups: BreakdownGroup[];
}

// --------------------------------------------------------------------------- //
// Leaderboards (Phase 5 — named ranked top-N of the precomputed aggregates)
// --------------------------------------------------------------------------- //

/** A configured leaderboard's metadata (from `GET /api/builder/leaderboards/`). */
export interface LeaderboardDefinition {
  id: number;
  program: number;
  metric: number;
  name: string;
  code: string;
  scope: Segment;
  period_type: string;
  order: 'DESC' | 'ASC';
  limit: number;
  is_active: boolean;
  display: MetricDisplay;
}

/** One ranked builder on a leaderboard (rank already assigned server-side). */
export interface LeaderboardRow {
  rank: number;
  builder_id: number;
  user_id: number;
  name: string;
  agency_code: string | null;
  level_code: string | null;
  avatar: string;
  status: BuilderStatus;
  is_company_owner: boolean;
  value: number;
}

/** The ranked payload from `GET /api/builder/leaderboards/{code}/`. */
export interface LeaderboardPayload {
  code: string;
  name: string;
  metric: MetricRef;
  scope: string;
  order: 'DESC' | 'ASC';
  limit: number;
  display: MetricDisplay;
  period: PerformancePeriod;
  as_of: string | null;
  rows: LeaderboardRow[];
}

// --------------------------------------------------------------------------- //
// Qualifications ("Builder N×" history)
// --------------------------------------------------------------------------- //

export interface QualificationRow {
  builder_id: number;
  user_id: number;
  period_id: number;
  period_start: string;
  current_value: number;
  target_value: number;
  qualified_at: string;
}

export interface QualificationPayload {
  count: number;
  results: QualificationRow[];
}

// --------------------------------------------------------------------------- //
// BuilderInvitation & profile
// --------------------------------------------------------------------------- //

export interface BuilderProfile {
  id: number;
  program: number;
  user: UserBrief;
  builder_code: string | null;
  status: BuilderStatus;
  joined_at: string | null;
  activated_at: string | null;
  terminated_at: string | null;
}

export interface BuilderInvitation {
  id: number;
  program: number;
  inviter: UserBrief;
  invitee: UserBrief;
  status: InvitationStatus;
  token: string;
  expires_at: string | null;
  created_at: string;
  responded_at: string | null;
  resent_at: string | null;
}

/** Payload for creating an invitation (the inviter is the requesting user). */
export interface CreateInvitationPayload {
  program: number;
  invitee: number;
}

/** DRF paginated envelope used by list endpoints. */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// --------------------------------------------------------------------------- //
// AI review (Phase 7 — pluggable AI review of builder artifacts)
// --------------------------------------------------------------------------- //
//
// Mirrors builder/serializers.py (AIReviewTemplate / AIReview) and the record +
// config endpoints (/api/builder/ai-reviews/, /api/builder/config/ai-review-templates/).

/** Lifecycle of one AI review run (PENDING/RUNNING poll → COMPLETED/FAILED). */
export type AIReviewStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

/** What a template reviews — a submitted form, or a builder's period metrics. */
export type AIReviewSubjectType = 'SUBMISSION' | 'BUILDER_PERIOD';

/** A configured AI review (the prompt/model config; read via the config API). */
export interface AIReviewTemplate {
  id: number;
  program: number;
  submission_type: number | null;
  name: string;
  code: string;
  description: string;
  subject_type: AIReviewSubjectType;
  system_prompt: string;
  prompt_template: string;
  /** Blank ⇒ the deployment default provider (AI_PROVIDER). */
  provider: string;
  /** Blank ⇒ the provider's default model. */
  model: string;
  max_tokens: number;
  temperature: number | null;
  auto_run_on_approve: boolean;
  is_active: boolean;
  config: Record<string, unknown>;
}

/** One AI review run + its result (the durable record). */
export interface AIReview {
  id: number;
  program: number;
  template: number | null;
  template_code: string | null;
  builder: BuilderProfile;
  submission: number | null;
  period: number | null;
  status: AIReviewStatus;
  provider: string;
  model: string;
  prompt: string;
  result_text: string;
  result: Record<string, unknown>;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  latency_ms: number;
  error: string;
  requested_by: number | null;
  created_at: string;
  completed_at: string | null;
}

/** Payload for requesting a review (`builder` defaults to the caller server-side). */
export interface CreateAIReviewPayload {
  template: number;
  submission?: number;
  period?: number;
  builder?: number;
}

/** Compact submission reference for the review-request picker (SubmissionSerializer). */
export interface SubmissionSummary {
  id: number;
  submission_type: number;
  submission_type_code: string;
  state_code: string;
  occurred_at: string | null;
  created_at: string;
}

// --------------------------------------------------------------------------- //
// Config write-path models (Phase 4 — the in-app dashboard builder)
// --------------------------------------------------------------------------- //
//
// These mirror `/api/builder/config/*` (builder/serializers.py). They are the raw
// config rows the dashboard builder edits — distinct from the assembled read
// payloads above (DashboardPayload is KPIs; DashboardConfig is the layout row).

/** A builder *segment* (Decisions 15/31) — the downline slice a widget/goal is about. */
export type Segment = 'INDIVIDUAL' | 'ROLE' | 'TEAM' | 'BASESHOP' | 'SUPERBASE' | 'SUPERTEAM';

/** A dashboard layout row (per-segment tier, Reporting, or a custom one). */
export interface DashboardConfig {
  id: number;
  program: number;
  name: string;
  code: string;
  default_scope: Segment;
  is_active: boolean;
}

/** An ordered group of widgets within a dashboard. */
export interface SectionConfig {
  id: number;
  program: number;
  dashboard: number;
  title: string;
  order: number;
}

/** A configured widget row: renderer type + metric + segment + JSON config. */
export interface WidgetConfig {
  id: number;
  program: number;
  section: number;
  type: WidgetType;
  /** MetricDefinition id, or null for composite widgets (e.g. the roster). */
  metric: number | null;
  scope: Segment;
  title: string;
  color_rule: Record<string, unknown>;
  config: Record<string, unknown>;
  order: number;
}

/** A metric definition row (used to populate the widget metric picker). */
export interface MetricDefinitionConfig {
  id: number;
  program: number;
  name: string;
  code: string;
  data_type: 'INTEGER' | 'DECIMAL';
  unit: string;
  aggregation: 'SUM' | 'COUNT' | 'MAX' | 'LAST';
  source: 'ERP_EVENT' | 'MANUAL' | 'ACTIVITY' | 'FORMULA' | 'DERIVED';
  is_active: boolean;
  display: MetricDisplay;
}

/** A goal definition row (used to preview which widgets carry a target). */
export interface GoalConfig {
  id: number;
  program: number;
  metric: number;
  name: string;
  code: string;
  target: string;
  period_type: PerformancePeriod['type'];
  scope: Segment;
  level: number | null;
  applies_at_or_above: boolean;
  display_cap_100: boolean;
  is_active: boolean;
}

/** One entry in a section-reorder request. */
export interface SectionReorderItem {
  id: number;
  order: number;
}

/** One entry in a widget-reorder request (may move a widget across sections). */
export interface WidgetReorderItem {
  id: number;
  order: number;
  /** New parent section id — omit to keep the widget where it is. */
  section?: number;
}

/** Fields accepted when creating/updating a widget via the config API. */
export type WidgetWriteInput = Partial<
  Pick<WidgetConfig, 'type' | 'metric' | 'scope' | 'title' | 'color_rule' | 'config' | 'order'>
> & { program?: number; section?: number };

/** Fields accepted when creating/updating a section via the config API. */
export type SectionWriteInput = Partial<Pick<SectionConfig, 'title' | 'order'>> & {
  program?: number;
  dashboard?: number;
};

/** Fields accepted when creating/updating a dashboard via the config API. */
export type DashboardWriteInput = Partial<
  Pick<DashboardConfig, 'name' | 'code' | 'default_scope' | 'is_active'>
> & { program?: number };
