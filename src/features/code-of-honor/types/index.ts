/**
 * Shapes returned by `/api/code-of-honor/` (backend `code_of_honor/views.py`).
 *
 * Member-facing types (`AnonymousAct`, `VoteFeed`, `WallResponse`) deliberately have no
 * nominee, submitter, original text or review state: the server never sends them, and
 * nothing here should be added that would invite joining them back in.
 */

export type Capability =
  | 'code_of_honor.view'
  | 'code_of_honor.submit'
  | 'code_of_honor.vote'
  | 'code_of_honor.review'
  | 'code_of_honor.manage_cycles'
  | 'code_of_honor.complete_cycle'
  | 'code_of_honor.manage_values'
  | 'code_of_honor.manage_settings';

export interface MyAccess {
  capabilities: Capability[];
  can_view: boolean;
  can_review: boolean;
  can_manage: boolean;
}

export interface HonorValue {
  key: string;
  name: string;
  description: string;
}

export interface PublicRules {
  submissions_per_month: number;
  likes_per_voter: number;
  coins: number[];
  min_text_length: number;
  max_text_length: number;
  allow_secondary_values: boolean;
  max_secondary_values: number;
}

export interface WallState {
  member: { id: string; name: string };
  capabilities: Capability[];
  voting: { cycle_id: string; label: string; round: 'main' | 'runoff' } | null;
  open_cycle: { id: string; label: string; vote_day: string };
  values: HonorValue[];
  rules: PublicRules;
}

/** An act as members see it: hidden-name text and values, optionally counts. */
export interface AnonymousAct {
  id: string;
  text: string;
  value: string;
  values: string[];
  likes?: number;
  liked?: boolean;
  can_like?: boolean;
}

export interface PodiumEntry {
  place: number;
  coins: number;
  nominee_name: string;
  likes: number;
  shared_place: boolean;
}

export interface WallResponse {
  cycle_id: string;
  label: string;
  vote_day: string;
  slots_total: number;
  slots_left: number;
  feed: {
    cycle_id: string;
    label: string;
    voting_live: boolean;
    totals_visible: boolean;
    acts: AnonymousAct[];
  };
  latest: { label: string; winners: PodiumEntry[] } | null;
}

export interface MemberOption {
  id: string;
  name: string;
  initials: string;
  photo_url: string | null;
}

export interface PreviewResponse {
  nominee_id: string;
  nominee_name: string;
  anonymous_text: string;
  blanks: string[];
}

export interface SubmitPayload {
  nominee_id: string;
  text: string;
  primary_value: string;
  secondary_values: string[];
}

export interface VoteFeed {
  status: 'voting' | 'runoff' | 'closed';
  cycle_id?: string;
  label?: string;
  round?: 'main' | 'runoff';
  totals_visible?: boolean;
  likes_total?: number;
  likes_left?: number;
  acts: AnonymousAct[];
}

export interface RevealedAct {
  id: string;
  text: string;
  nominee_name: string;
  likes: number;
  value: string;
  values: string[];
  place?: number;
  coins?: number;
  shared_place?: boolean;
}

export interface MonthOption {
  id: string;
  label: string;
}

export interface ResultsResponse {
  months: MonthOption[];
  result: {
    cycle_id: string;
    label: string;
    months: MonthOption[];
    winners: RevealedAct[];
    others: RevealedAct[];
  } | null;
}

export interface LeaderboardRow {
  rank: number;
  nominee_id: string;
  name: string;
  coins: number;
  firsts: number;
  podiums: number;
  initials: string;
  photo_url: string | null;
}

export interface LeaderboardResponse {
  year: number;
  years: number[];
  rows: LeaderboardRow[];
}

/* --- committee ------------------------------------------------------------ */

export type CycleStatus = 'open' | 'voting' | 'runoff' | 'closed';

export interface CycleSummary {
  id: string;
  label: string;
  status: CycleStatus;
  vote_day: string;
  acts: number;
  hidden: number;
  in_vote: number;
}

export interface ReviewAct {
  id: string;
  text: string;
  anonymous_text: string;
  anonymous_text_edited: boolean;
  nominee_name: string;
  submitter_name: string;
  likes: number;
  runoff_likes: number;
  in_runoff: boolean;
  review_state: 'submitted' | 'approved' | 'hidden';
  in_vote: boolean;
  leftover_names: string[];
  primary_value: string;
  primary_value_name: string;
  secondary_values: string[];
  values_corrected: boolean;
  created_at: string;
}

export interface ReviewResponse {
  cycles: CycleSummary[];
  selected: CycleSummary;
  require_approval: boolean;
  acts: ReviewAct[];
}

export type ReviewAction =
  | { action: 'hide' }
  | { action: 'restore' }
  | { action: 'approve' }
  | { action: 'edit_anonymous_text'; text: string }
  | { action: 'correct_values'; primary_value: string; secondary_values: string[] };

/** A tied act in a 409 `tie_runoff_required` / `tie_decision_required`. */
export interface TiedAct {
  id: string;
  text: string;
  likes: number;
  runoff_likes: number;
}

export interface CompleteResponse {
  ok: true;
  cycle: CycleSummary;
  winners: PodiumEntry[];
}

export interface AuditEvent {
  action: string;
  actor: string;
  at: string;
  act_id: string | null;
  cycle_id: string | null;
  detail: Record<string, unknown>;
}

/* --- admin ---------------------------------------------------------------- */

export interface AdminSettings {
  submissions_per_month: number;
  likes_per_voter: number;
  runoff_likes_per_voter: number;
  coins: number[];
  require_approval: boolean;
  vote_totals: 'live' | 'hidden' | 'committee';
  reveal_submitter: boolean;
  min_text_length: number;
  max_text_length: number;
  allow_secondary_values: boolean;
  max_secondary_values: number;
}

export interface AdminSettingsResponse {
  settings: AdminSettings;
  choices: { vote_totals: { value: AdminSettings['vote_totals']; label: string }[] };
  editable: (keyof AdminSettings)[];
}

export interface AdminValue extends HonorValue {
  position: number;
  is_active: boolean;
}
