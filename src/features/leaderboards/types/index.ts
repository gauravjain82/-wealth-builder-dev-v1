/**
 * Wire types for the WB Leaderboards APIs (Django `wbreporting` app).
 *
 * Every field here is decided server-side. In particular the masking tier is not a
 * client concern: a proof row simply arrives without the keys this viewer may not
 * see, which is why the protected fields on `DetailRow` are optional rather than
 * nullable — an absent key means "not permitted", and there is nothing to render.
 */

/** Hierarchy scopes a leaderboard can be computed over. */
export type Scope = 'personal' | 'net_base' | 'smd_base' | 'super_base' | 'super_team';

/** Which set of metrics the expanded view is showing. */
export type StatsMode = 'general' | 'ratios';

/** Where a set of totals came from. `daily_fallback` is a normal state. */
export type ResultSource = 'daily_current' | 'monthly_snapshot' | 'daily_fallback';

/** The four additive metrics, plus the four read-time ratios. */
export type GeneralMetric = 'recruits' | 'points' | 'licenses' | 'convention';
export type RatioMetric = 'npr' | 'ppr' | 'ppl' | 'lr';
/**
 * The three first-milestone metrics — ranked in the standard board alongside the
 * additive metrics. `rr` 1st Recruit, `rc` 10% Evaluation, `rbe` Register for
 * Convention. They are ranked leaders here, not the aggregate counts the Full Report
 * shows.
 */
export type MilestoneMetric = 'rr' | 'rc' | 'rbe';
export type LeaderboardMetric = GeneralMetric | RatioMetric | MilestoneMetric;

/** Stable error codes the API returns in the `code` field of a 4xx body. */
export type LeaderboardErrorCode =
  | 'invalid_date_range'
  | 'scope_not_supported'
  | 'metric_not_supported'
  | 'agent_not_found'
  | 'detail_forbidden'
  | 'source_unavailable';

/** One ranked leader in an SMD or MD panel. */
export interface LeaderRow {
  agent_id: string;
  name: string;
  level_code: string;
  member_count: number;
  /** Members with no agency code, who contribute nothing to the reporting tables. */
  uncoded_member_count: number;
  value: string | null;
  rank: number;
  ratios: Record<string, number | null>;
  direct_smd_agent_id: string | null;
  contributes_to_agent_id: string | null;
  contributes_to_name: string | null;
  /** "Super Base" or "Super Team" — only set in those two scopes, for MDs. */
  contributes_to_label: string | null;
}

/** The compact home-card payload. Carries no proof rows by design. */
export interface LeaderboardCardResponse {
  start: string;
  end: string;
  period_label: string;
  metric: LeaderboardMetric;
  metric_label: string;
  scope: Scope;
  source: ResultSource;
  smd: LeaderRow[];
  md: LeaderRow[];
  can_expand: boolean;
  can_open_full_report: boolean;
}

/** The caller's own totals for the current selection. */
export interface ViewerSummary {
  agent_id: string;
  member_count: number;
  uncoded_member_count: number;
  totals: Record<GeneralMetric, string>;
  ratios: Record<RatioMetric, number | null>;
}

export interface LeaderboardResponse {
  start: string;
  end: string;
  period_label: string;
  range_key: string;
  metric: LeaderboardMetric;
  scope: Scope;
  measurement_mode: 'new_recruit_cohort' | 'milestones_completed';
  show_net_base: boolean;
  /** Scopes this deployment offers — Net Base is absent while it is switched off. */
  visible_scopes: Scope[];
  visible_ranges: Array<{ key: string; label: string }>;
  general_metrics: Array<{ key: GeneralMetric; label: string }>;
  ratio_metrics: RatioMetric[];
  source: ResultSource;
  smd: LeaderRow[];
  md: LeaderRow[];
  viewer: ViewerSummary;
}

/** One Full Report column: a gauge, a goal, and both ranking panels. */
export interface FullReportMetric {
  key: GeneralMetric;
  label: string;
  current: string;
  goal: string;
  /** Null when the goal is zero — a gauge with no target has no percentage. */
  percent: number | null;
  smd: LeaderRow[];
  md: LeaderRow[];
}

/**
 * One first-milestone metric. `available: false` means the source had no recorded
 * date for this period and could not be backfilled — render it as "no data", never
 * as zero.
 */
export interface MilestoneSummary {
  key: 'rr' | 'rc' | 'rbe';
  available: boolean;
  completed: number | null;
  population: number | null;
  ratio: number | null;
  reason: string;
}

export interface FullReportResponse {
  start: string;
  end: string;
  month: string;
  period_label: string;
  scope: Scope;
  source: ResultSource;
  available_months: Array<{ value: string; label: string }>;
  metrics: FullReportMetric[];
  milestones: MilestoneSummary[];
}

/** A proof row. Protected keys are absent, not null, when not permitted. */
export type DetailRow = Record<string, string | number | null | undefined>;

export interface DetailResponse {
  metric: string;
  title: string;
  agent_id: string;
  agent_name: string;
  scope: Scope;
  start: string;
  end: string;
  columns: Array<{ key: string; label: string }>;
  rows: DetailRow[];
  cards: Array<{ label: string; value: string | number | null }>;
  formula: string;
  next_cursor: string | null;
  total_rows: number;
  /** Non-empty when the metric has no recorded data for this period. */
  unavailable_reason: string;
  definition: {
    title?: string;
    definition_text?: string;
    calculation_text?: string;
    interpretation_text?: string;
  };
}

/** Capability flags from `/api/wbreporting/my-access/`. */
export interface LeaderboardAccess {
  can_view: boolean;
  can_manage: boolean;
  can_view_leaderboards: boolean;
}

/** The selection that drives every request, shared across card, panel and route. */
export interface LeaderboardSelection {
  metric: LeaderboardMetric;
  scope: Scope;
  rangeKey: string;
  start?: string;
  end?: string;
}

/** Company-wide goals used as the Full Report's gauge denominators. */
export interface LeaderboardGoals {
  recruits_goal: string;
  points_goal: string;
  licenses_goal: string;
  convention_goal: string;
  updated_at?: string;
}

/** How much of another agent's detail one viewer relationship may see. */
export type DetailVisibility = 'hidden' | 'masked' | 'full';

/** The relationship keys of the 7x3 visibility matrix. */
export type VisibilityRelationship =
  | 'public'
  | 'self'
  | 'direct_downline'
  | 'downline'
  | 'leader'
  | 'smd'
  | 'broker';

/** Section visibility, milestone mode, and the per-relationship masking matrix. */
export interface LeaderboardDisplaySettings {
  show_net_base: boolean;
  milestone_measurement_mode: 'new_recruit_cohort' | 'milestones_completed';
  public_detail: DetailVisibility;
  self_detail: DetailVisibility;
  direct_downline_detail: DetailVisibility;
  downline_detail: DetailVisibility;
  leader_detail: DetailVisibility;
  smd_detail: DetailVisibility;
  broker_detail: DetailVisibility;
  updated_at?: string;
}

/** A named date-range choice offered in the leaderboard's range selector. */
export interface LeaderboardDateRange {
  range_key: string;
  label: string;
  sort_order: number;
  is_visible: boolean;
}
