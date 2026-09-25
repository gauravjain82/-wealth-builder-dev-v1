/**
 * Payload shapes for the WB Contests surfaces.
 *
 * These mirror `wbreporting/serializers_contests.py`. Two things about them are
 * deliberate and worth stating, because a well-meaning edit would break both:
 *
 * - `progress` is `number | null`, and `null` means **there is no number** — an
 *   ineligible cell, or a tier nothing could be measured for. It must never be
 *   coalesced to `0` for rendering: a zero reads as a real score.
 * - Nothing here describes a daily result row. Django prepares the standings; the
 *   browser receives evaluations and renders them.
 */

/** Hierarchy scopes the contest views accept. Note: `net` is a *filter*, not a scope. */
export type ContestScope = 'all' | 'personal' | 'base' | 'smd_base' | 'super_base' | 'super_team';

/** The contract's three-value reader vocabulary, derived from five stored values. */
export type ContestStatus = 'considered' | 'active' | 'ended';

export type SortDirection = 'asc' | 'desc';

/** The eleven configurable tier thresholds. */
export type ThresholdMetric =
  | 'pr' | 'br' | 'pp' | 'bp' | 'slic' | 'lic' | 'se' | 'be' | 'c' | 'mr' | 'mp';

/** Stable error codes the backend sends as `{code, detail}`. */
export type ContestErrorCode =
  | 'contest_not_found'
  | 'tier_not_found'
  | 'agent_not_found'
  | 'profile_forbidden'
  | 'flyer_not_found'
  | 'invalid_scope'
  | 'invalid_period'
  | 'invalid_request'
  | 'metric_not_supported'
  | 'person_required'
  | 'edit_conflict'
  | 'invalid_tier_threshold'
  | 'invalid_level_rule'
  | 'invalid_tier_order'
  | 'tier_metric_unavailable'
  | 'flyer_file_required'
  | 'flyer_size_invalid'
  | 'flyer_type_invalid'
  | 'storage_failed';

/** Capability flags from `/api/wbreporting/my-access/`. */
export interface ContestAccess {
  can_view_contests: boolean;
  can_view_leaderboards: boolean;
  can_manage: boolean;
}

export interface TierRequirement {
  metric: ThresholdMetric;
  label: string;
  value: number;
  /** True for `br`/`bp`/`lic` — the single-hop Leader measures that must be labelled. */
  single_hop_team: boolean;
  /** False when this deployment cannot measure the metric over this tier's period. */
  available: boolean;
}

export interface TierSummary {
  id: number;
  name: string;
  order: number;
  period_label: string;
  reward: string;
  notes: string;
  requirements: TierRequirement[];
  qualified: number;
  near: number;
  in_running: number;
  /** Requirement keys that could not be measured over this tier's period. */
  unmeasured: string[];
  single_hop_team: boolean;
}

export interface ContestSummary {
  id: number;
  name: string;
  status: ContestStatus;
  /** The five stored lifecycle values, for the settings screen. */
  contest_status: string;
  period_mode: string;
  period_label: string;
  has_visible_flyer: boolean;
  flyer_kind: 'image' | 'pdf' | null;
  tiers?: Array<Pick<TierSummary, 'id' | 'name' | 'order' | 'period_label' | 'reward'> & {
    requirement_count: number;
  }>;
}

export interface MetricProgress {
  metric: ThresholdMetric;
  label: string;
  requirement: number;
  /** `null` when the metric could not be measured — never a substituted zero. */
  actual: number | null;
  percent: number | null;
  met: boolean;
  available: boolean;
  unavailable_reason: string;
  single_hop_team: boolean;
  detail_available: boolean;
}

export interface TierEvaluation {
  tier_id: number;
  eligible: boolean;
  /** `null` for an ineligible cell (render blank) or a wholly unmeasurable tier. */
  progress: number | null;
  qualified: boolean;
  near: boolean;
  unavailable: boolean;
  partially_measurable: boolean;
  unmeasured: string[];
  /** Empty for an ineligible cell: there is deliberately no number to display. */
  metrics: MetricProgress[];
}

export interface StandingRow {
  agent_id: number;
  agency_code: string;
  name: string;
  level: string;
  is_active: boolean;
  best_percent: number | null;
  evaluations: Record<string, TierEvaluation>;
}

export interface ContestFilters {
  person: number | null;
  scope: ContestScope;
  net: boolean;
  leaders: boolean;
  agents: boolean;
  selected_tiers: number[];
}

export interface StandingsResponse {
  contest: ContestSummary;
  tiers: TierSummary[];
  rows: StandingRow[];
  sort_tier: number | null;
  direction: SortDirection;
  next_cursor: string | null;
  total_rows: number;
  uncoded_member_count: number;
  near_percent: number;
  /** Non-empty when any visible tier uses a single-hop Leader measure. */
  team_credit_note: string;
  show_tier_overview: boolean;
  show_near_qualifiers: boolean;
  filters: ContestFilters;
}

export interface ProofColumn {
  key: string;
  label: string;
}

export interface ProofResponse {
  metric: ThresholdMetric;
  label: string;
  title: string;
  period: { start: string; end: string; label: string };
  available: boolean;
  message: string;
  requirement: number | null;
  actual: number | null;
  percent: number | null;
  columns: ProofColumn[];
  rows: Array<Record<string, unknown>>;
  cards: Array<{ label: string; value: string | number | null }>;
  formula: string;
  next_cursor: string | null;
  total_rows: number;
  team_credit_note: string;
}

export interface ProfilePathNode {
  agent_id: number;
  agency_code: string;
  name: string;
  level: string;
}

export interface ProfileResponse {
  agent_id: number;
  agency_code: string;
  name: string;
  level: string;
  is_active: boolean;
  is_licensed: boolean;
  recruiter: ProfilePathNode | null;
  leader: ProfilePathNode | null;
  recruiting_path: ProfilePathNode[];
  leader_path: ProfilePathNode[];
}

export interface FlyerResponse {
  url: string;
  kind: 'image' | 'pdf';
  mime: string;
  original_name: string;
}

/** Draft filter state. Nothing here reaches the server until Apply is pressed. */
export interface FilterDraft {
  personId: number | null;
  personLabel: string;
  scope: ContestScope;
  net: boolean;
  leaders: boolean;
  agents: boolean;
}

/** What the card actually queries with. */
export interface StandingsQuery extends FilterDraft {
  contestId: number;
  tierIds: number[];
  sortTier: number | null;
  direction: SortDirection;
  cursor?: string;
}
