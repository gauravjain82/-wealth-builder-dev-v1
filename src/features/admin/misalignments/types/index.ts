/**
 * Domain types for the read-only Data Integrity reports (leader & policy
 * misalignments). These mirror the JSON returned by the Django `misalignments`
 * app; field names intentionally match the backend contract 1:1.
 */

export interface MisalignmentsAccess {
  can_view: boolean;
}

/* ------------------------------------------------------------ Leader report */

export interface RecruitingTrailNode {
  id: number;
  name: string | null;
  agent_id: string | null;
  level_code: string | null;
}

export interface LeaderMisalignmentRow {
  id: number;
  name: string | null;
  agent_id: string | null;
  level_code: string | null;
  email: string | null;
  phone: string | null;
  last_login: string | null;
  recruited_by_id: number | null;
  parent_id: number | null;
  leader_id: number | null;
  leader_name: string | null;
  leader_agent_id: string | null;
  leader_level_code: string | null;
  recruiting_trail: RecruitingTrailNode[];
  reasons: string[];
  bad_reference_fields: string[];
}

export interface LeaderMisalignmentsResponse {
  ok: boolean;
  rows: LeaderMisalignmentRow[];
  count: number;
}

/* ------------------------------------------------------------ Policy report */

export interface PolicyAgent {
  split_id: number;
  agent_id: number | null;
  split_percentage: number | null;
  valid: boolean;
  name: string | null;
  agency_code: string | null;
}

export interface PolicyMisalignmentRow {
  policy_id: number;
  policy_number: string | null;
  client_name: string | null;
  policy_status: string | null;
  date_written: string | null;
  created_by_id: number | null;
  created_by_name: string | null;
  created_by_agency_code: string | null;
  updated_by_id: number | null;
  updated_by_name: string | null;
  updated_by_agency_code: string | null;
  agents: PolicyAgent[];
  reasons: string[];
  missing_agents: number;
}

export interface PolicyMisalignmentsResponse {
  ok: boolean;
  rows: PolicyMisalignmentRow[];
  count: number;
}

/* ------------------------------------------------------------ Policy detail */

export interface PolicyDetailPolicy {
  id: number;
  policy_number: string | null;
  client_name: string | null;
  status: string | null;
  date_written: string | null;
  closure_date: string | null;
  issued_date: string | null;
  policy_delivery_mode: string | null;
  policy_delivery_status: string | null;
  is_trial_app: boolean | number | null;
  multiplier_snapshot: string | number | null;
  base_points: string | number | null;
  client_id: number | null;
  client_account_name: string | null;
  client_account_code: string | null;
}

export interface PolicyDetailAgent {
  id: number;
  agent_id: number | null;
  split_percentage: string | number | null;
  full_name: string | null;
  agency_code: string | null;
  is_active: boolean | number | null;
}

export interface PolicyLedgerEntry {
  id: number;
  entry_type: string | null;
  points: string | number | null;
  effective_date: string | null;
  created_at: string | null;
  user_id: number | null;
  advance_payment_id: number | null;
}

export interface PolicyAdvance {
  id: number;
  advance_type: string | null;
  percentage: string | number | null;
  paid_date: string | null;
  created_at: string | null;
}

export interface PolicyChargeback {
  id: number;
  chargeback_type: string | null;
  chargeback_date: string | null;
  months_completed: number | null;
  calculated_percentage: number | null;
  created_at: string | null;
}

export interface PolicyDetail {
  policy: PolicyDetailPolicy;
  agents: PolicyDetailAgent[];
  ledger: PolicyLedgerEntry[];
  advances: PolicyAdvance[];
  chargebacks: PolicyChargeback[];
}

export interface PolicyDetailResponse {
  ok: boolean;
  detail: PolicyDetail;
}
