/**
 * Wire types for `/api/matchup/metrics/*` (backend: matchup/services/metrics.py).
 *
 * Every drill-down level returns the same envelope: a `summary` for the level
 * and `rows` for the next level down, once per section (trainer requests and
 * personal appointments are never mixed).
 */

export type MetricsSection = 'REQUEST_TRAINER' | 'PERSONAL';
export type CountMode = 'prospects' | 'appointments';
export type Segment = 'BASESHOP' | 'SUPERBASE' | 'SUPERTEAM';
export type RowKind = 'smd' | 'agent' | 'prospect';

export type Outcome =
  | 'showed'
  | 'no_show'
  | 'upcoming'
  | 'result_pending'
  | 'not_accepted'
  | 'no_trainer'
  | 'cancelled';

export type OutcomeCounts = Record<Outcome, number>;

export interface StepCounts extends OutcomeCounts {
  booked: number;
}

export interface StepMeta {
  key: string;
  label: string;
  historical: boolean;
}

export interface FunnelStage {
  key: string;
  label: string;
  value: number;
}

export interface MetricsBlock {
  total: number;
  agents: number;
  unlinked: number;
  showed: number;
  overall: OutcomeCounts;
  steps: Record<string, StepCounts>;
  outcomes: {
    fna: number;
    ama: number;
    sale: number;
    second_appointment: number;
    invited_to_bpm: number;
    referrals: number;
  };
  new_recruit_bookings: number;
  rates: { show: number | null; fna: number | null; ama: number | null };
  last_start_at: string | null;
}

export interface MetricsRow extends MetricsBlock {
  id: number | null;
  kind: RowKind;
  name: string;
  agency_code: string;
  furthest_step?: string | null;
}

export interface SectionReport {
  summary: MetricsBlock & { funnel: FunnelStage[] };
  rows: MetricsRow[];
}

export interface Subject {
  id: number | null;
  name: string;
  agency_code: string;
}

export interface MetricsReport {
  window: { start: string; end: string };
  mode: CountMode;
  org_wide: boolean;
  segment: Segment | null;
  steps: StepMeta[];
  sections: Record<MetricsSection, SectionReport>;
  subject?: Subject;
}

export interface JourneyAppointment {
  id: number;
  uuid: string;
  kind: MetricsSection;
  start_at: string;
  timezone: string;
  status: string;
  in_window: boolean;
  types: string[];
  steps: string[];
  outcome: Outcome;
  flags: string[];
  referrals: number;
  edified: string;
  agent: { id: number | null; name?: string; agency_code?: string };
  trainer: { id: number | null; name?: string; agency_code?: string };
}

export interface ProspectJourney {
  window: { start: string; end: string };
  steps: StepMeta[];
  subject: Subject;
  appointments: JourneyAppointment[];
}

export interface MetricsAccess {
  can_view: boolean;
  org_wide: boolean;
  segments: Segment[];
}

export interface MetricsQuery {
  start: string;
  end: string;
  mode: CountMode;
  /** Undefined = whole organisation (org-wide viewers only). */
  segment?: Segment;
}

/**
 * `/api/matchup/metrics/trend/*`: the same numbers as the report endpoints,
 * once per ISO week (Monday–Sunday, UTC). Every array is aligned
 * index-for-index with `weeks`, oldest first; an empty week is 0.
 */
export interface TrendWeek {
  start: string;
  end: string;
  /** The week still in progress (it contains today). */
  partial: boolean;
}

export interface TrendCounts {
  total: number;
  showed: number;
  upcoming: number;
  result_pending: number;
  fna: number;
  ama: number;
  sale: number;
}

/** Weekly series for one row of the existing report; join on `kind` + `id`. */
export interface TrendRow {
  id: number | null;
  kind: RowKind;
  name: string;
  total: number[];
  showed: number[];
  ama: number[];
}

export interface TrendSection {
  summary: TrendCounts[];
  /** SMDs at organisation level, agents at SMD level, `[]` at agent level. */
  rows: TrendRow[];
}

export interface MetricsTrend {
  mode: CountMode;
  org_wide: boolean;
  segment: Segment | null;
  weeks: TrendWeek[];
  sections: Record<MetricsSection, TrendSection>;
}

/** `start` is not sent: the trend is anchored on `end` alone. */
export interface TrendQuery {
  end: string;
  mode: CountMode;
  segment?: Segment;
  /** 4–26; the backend defaults to 12. */
  weeks: number;
}
