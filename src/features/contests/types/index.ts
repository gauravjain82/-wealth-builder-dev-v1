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

import type { WbReportingAccess } from '@shared/wbreporting-access';

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
  | 'flyer_file_required'
  | 'flyer_size_invalid'
  | 'flyer_type_invalid'
  | 'storage_failed';

/** Contests' view of the shared `/api/wbreporting/my-access/` payload. */
export type ContestAccess = Pick<
  WbReportingAccess,
  'can_view_contests' | 'can_view_leaderboards' | 'can_manage'
>;

export interface TierRequirement {
  metric: ThresholdMetric;
  label: string;
  value: number;
  /** True for `br`/`bp`/`lic` — the single-hop Leader measures that must be labelled. */
  single_hop_team: boolean;
  /** False when the metric has no source over this tier's period; it counts as 0 (C15). */
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
  /** Everyone listed for the contest — the same on every card (C18). */
  in_running: number;
  /** Requirement keys with no source over this tier's period, scored as 0 (C15). */
  unmeasured: string[];
  single_hop_team: boolean;
  /** Whether the tier is in the current selection; every tier when none is chosen. */
  selected: boolean;
  /** Only unlicensed people are eligible; the page's goals line ends "Non-License". */
  non_license: boolean;
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
  /** `0` for a metric with no source (C15). */
  actual: number | null;
  /** A whole number (C20). */
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
  /** A whole number (C20); `null` only for an ineligible cell, which renders blank. */
  progress: number | null;
  qualified: boolean;
  near: boolean;
  /** Requirement keys with no source, scored as 0 (C15). */
  unmeasured: string[];
  /** Empty for an ineligible cell: there is deliberately no number to display. */
  metrics: MetricProgress[];
}

export interface StandingRow {
  agent_id: number;
  agency_code: string;
  name: string;
  /** Absent when the display settings hide levels; `""` means the person has none. */
  level?: string;
  /**
   * The assigned leader's name, or code. Absent when the display settings hide it;
   * `""` when there is no coded leader, which the page shows as "Leader: -" (dtez).
   */
  leader_name?: string;
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
  near_percent: number;
  /** Non-empty when any visible tier uses a single-hop Leader measure. */
  team_credit_note: string;
  show_tier_overview: boolean;
  show_near_qualifiers: boolean;
  filters: ContestFilters;
  /**
   * How many people the Leaders / Agents filters call leaders — somebody names them as
   * their leader — over the view's candidate map, not the rows. dtez's "N leaders
   * identified" (parity phase 18). Absent from a backend older than that phase, and
   * then rendered as `—`, never `0`.
   */
  leader_count?: number;
}

/** One person on the featured-contest card, at the tier that places them there. */
export interface ShowcaseEntry {
  agent_id: number;
  /** `""` when the display settings hide agency codes. */
  agency_code: string;
  name: string;
  /** The profile thumbnail, or null when the person has none. */
  photo_url: string | null;
  tier_id: number;
  tier_name: string;
  /** A whole number; the hardest running tier's progress, or 100 for a qualifier. */
  progress: number | null;
  qualified: boolean;
}

/**
 * The featured-contest card (dtez's `wb_contests_showcase.php`), ranked server-side
 * over everyone the viewer may see — no standings page holds all of them.
 */
export interface ShowcaseResponse {
  contest: ContestSummary;
  /** Hardest qualified tier first, then name. At most ten. */
  qualifiers: ShowcaseEntry[];
  /** Highest progress on the hardest running tier first. At most ten. */
  closest: ShowcaseEntry[];
  /** Over everyone, not the ten shown. */
  qualified_count: number;
  in_progress_count: number;
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
  /**
   * The metric over every source row, not only this page: a count, or net points
   * (parity phase 20, dtez's "BR source total"). Absent from an older backend.
   */
  source_total?: number | null;
  /** More rows exist than this page holds; the page is the first 1,000. */
  truncated?: boolean;
  /** How much client and policy detail this viewer gets: `hidden`, `masked`, `full`. */
  detail_visibility?: 'hidden' | 'masked' | 'full';
  /**
   * The developer panel's source SQL. **Present only for `wbreporting:manage`**; the
   * server omits the key for everyone else. `""` when the metric has no source query.
   */
  sql?: string;
  sql_params?: Record<string, unknown>;
}

export interface ProfilePathNode {
  agent_id: number;
  agency_code: string;
  name: string;
  /** Absent when the display settings hide levels (parity phase 20). */
  level?: string;
}

export interface ProfileResponse {
  agent_id: number;
  agency_code: string;
  name: string;
  /**
   * Absent when the display settings hide levels; `""` is a person with no level, which
   * reads "No level" (parity phase 20, as phase 19 did for standings rows).
   */
  level?: string;
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

/** One match from the person search: a user id and dtez's `Name [CODE]` label. */
export interface PersonOption {
  id: number;
  label: string;
  agencyCode: string;
  name: string;
}

/** The cell a proof dialog is opened for. */
export interface ProofTarget {
  contestId: number;
  tierId: number;
  agentId: number;
  agentName: string;
  tierName: string;
  /** The tier's period as the grid shows it, until the proof's own arrives. */
  periodLabel: string;
  metric: ThresholdMetric;
}

/** The agent a profile dialog is opened for. */
export interface ProfileTarget {
  contestId: number;
  agentId: number;
  name: string;
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

/* --- settings (wbreporting:manage) ---------------------------------------- */

/** One selectable eligibility level, driven by the host's `accounts.Level` table. */
export interface LevelOption {
  code: string;
  label: string;
  /** True only for `NON`, which means "no level assigned" rather than a real row. */
  synthetic: boolean;
}

/** One threshold field in the tier metric row. */
export interface MetricOption {
  metric: ThresholdMetric;
  label: string;
  maximum: number;
  /** False for metrics this deployment has no source for; they cannot be required. */
  measurable: boolean;
  single_hop_team: boolean;
  /** The Leader-credit note, present only for the single-hop metrics. */
  note: string;
}

/** Everything the editor needs to render itself, served rather than hard-coded. */
export interface EditorOptions {
  levels: LevelOption[];
  metrics: MetricOption[];
  contest_statuses: Array<{ value: string; label: string }>;
  period_modes: Array<{ value: string; label: string }>;
  flyer: { max_bytes: number; allowed_types: string[] };
  near_percent: number;
}

/** A tier as the editor holds it. `revision` is the concurrency token. */
export interface EditableTier {
  id?: number;
  revision?: number;
  tier_order: number;
  tier_name: string;
  reward: string;
  notes: string;
  non_license: boolean;
  is_hidden: boolean;
  only_levels: string;
  restricted_levels: string;
  tier_period_mode: string;
  tier_start: string | null;
  tier_end: string | null;
  tier_rolling_days: number | null;
  thresholds: Partial<Record<ThresholdMetric, number | null>>;
  /** Client-only: marks a tier for deletion in the next save. */
  pending_delete?: boolean;
}

/** A contest as the editor holds it — carries private fields a reader never sees. */
export interface EditableContest {
  id: number;
  revision: number;
  name: string;
  status: ContestStatus;
  contest_status: string;
  period_mode: string;
  period_label: string;
  notes: string;
  qualifying_start: string | null;
  qualifying_end: string | null;
  rolling_days: number | null;
  hidden: boolean;
  deleted: boolean;
  flyer_visible: boolean;
  flyer_original_name: string;
  has_visible_flyer: boolean;
  flyer_kind: 'image' | 'pdf' | null;
  tiers: EditableTier[];
}

/** The tier shape the save endpoint accepts. */
export interface TierSubmission {
  id?: number;
  revision?: number;
  tier_order: number;
  tier_name: string;
  reward: string;
  notes: string;
  non_license: boolean;
  is_hidden: boolean;
  levels: string[];
  tier_period_mode: string;
  tier_start: string | null;
  tier_end: string | null;
  tier_rolling_days: number | null;
  thresholds: Partial<Record<ThresholdMetric, string>>;
  pending_delete?: boolean;
}
