/**
 * Wire types for `/api/training-schedule/` (backend app `training_schedule`).
 *
 * Instants are UTC ISO strings; `timezone` is the IANA zone the host scheduled
 * the training in. A key the viewer may not see is absent, not null.
 */

export type Recurrence = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

/** How this date reached the viewer. */
export type Relation = 'own' | 'inherited' | 'baseshop' | 'admin';

export interface PersonRef {
  id: number;
  name: string;
}

export interface MyAccess {
  /** At or above the hosting level (SMD unless an administrator changed it). */
  can_host: boolean;
  /** Holds `training_schedule:manage`: sees and manages every training. */
  can_manage_all: boolean;
  host_level: string | null;
}

export interface ScheduleOccurrence {
  id: number;
  training_id: number;
  title: string;
  description: string;
  meeting_url: string;
  color: string;
  timezone: string;
  start_at: string;
  end_at: string;
  /** `yyyy-MM-dd` in the training's own zone. */
  local_date: string;
  /** `HH:mm` on the training's wall clock. */
  start_time: string;
  duration_minutes: number;
  recurrence: Recurrence;
  /** Whether missing it counts against a member in the attendance metrics. */
  counts_toward_attendance: boolean;
  /** Dates left in the series, this one included. */
  series_count: number;
  owner: PersonRef;
  relation: Relation;
  /** The hosts whose BaseShop puts this date on the viewer's schedule. */
  via: PersonRef[];
  /** Set for a host who inherited this date: the whole series or just this date. */
  my_inheritance: 'all' | 'single' | null;
  can_manage: boolean;
  can_view_attendance: boolean;
  attended: boolean;
  /** Present only with `can_view_attendance`. */
  attendance_count?: number;
  attendance_token?: string;
  /** Present only with `can_manage`: hosts who inherited this date. */
  inheritors?: PersonRef[];
}

export interface TrainingInput {
  title: string;
  description: string;
  meeting_url: string;
  color: string;
  timezone: string;
  start_date: string;
  start_time: string;
  duration_minutes: number;
  recurrence: Recurrence;
  occurrence_count: number;
  counts_toward_attendance: boolean;
}

/** The fields an edit may change; the dates of a series are fixed once created. */
export type TrainingPatch = Pick<
  TrainingInput,
  | 'title'
  | 'description'
  | 'meeting_url'
  | 'color'
  | 'timezone'
  | 'start_time'
  | 'duration_minutes'
  | 'counts_toward_attendance'
>;

/** `occurrenceId` absent means the whole series. */
export interface TrainingTarget {
  trainingId: number;
  occurrenceId?: number;
}

export type DeleteBlockedReason = 'delete_blocked_inherited' | 'delete_blocked_completed';

export interface DeletePreview {
  training_id: number;
  title: string;
  scope: 'series' | 'occurrence';
  occurrence_count: number;
  completed_count: number;
  upcoming_count: number;
  /** Completed dates the admin's policy keeps on record. */
  kept_completed_count: number;
  attendance_count: number;
  inheritors: PersonRef[];
  removes_series: boolean;
  can_delete: boolean;
  blocked_reason: DeleteBlockedReason | null;
}

export interface Host {
  id: number;
  name: string;
  level: string | null;
  is_upline: boolean;
  training_count: number;
}

export interface HostTraining {
  id: number;
  title: string;
  description: string;
  color: string;
  timezone: string;
  recurrence: Recurrence;
  duration_minutes: number;
  inherits_series: boolean;
  occurrences: { id: number; start_at: string; end_at: string; inherited: boolean }[];
}

export interface Attendee {
  user_id: number;
  name: string;
  level: string | null;
  attended_at: string;
}

export interface AttendanceRoster {
  occurrence_id: number;
  /** `baseshop` for a host who inherited the date: their own people only. */
  scope: 'all' | 'baseshop';
  count: number;
  attendees: Attendee[];
}

/** What the attendance link resolves to; `start_at` is null when nothing is scheduled. */
export interface AttendanceSummary {
  training_id: number;
  title: string;
  host_name: string;
  timezone: string;
  meeting_url: string;
  occurrence_id: number | null;
  start_at: string | null;
  end_at: string | null;
}

export interface AttendResult extends AttendanceSummary {
  status: 'recorded' | 'already_recorded';
  attended_at: string;
}

export interface Choice {
  value: string;
  label: string;
}

export interface ScheduleSettings {
  creator_min_level: string | null;
  inherited_delete_policy: string;
  completed_delete_policy: string;
  attendance_opens_minutes_before: number;
  attendance_closes_minutes_after: number;
  metrics_window: number;
  stopped_after_misses: number;
  slipping_after_misses: number;
  slipping_below_rate: number;
  judge_after_expected: number;
  choices: {
    levels: { code: string; name: string }[];
    inherited_delete_policy: Choice[];
    completed_delete_policy: Choice[];
  };
}

export type ScheduleSettingsPatch = Partial<Omit<ScheduleSettings, 'choices'>>;

/* --- attendance metrics ---------------------------------------------------- */

/** Most urgent first; the backend sorts members in this order. */
export type MemberStatus = 'stopped' | 'never' | 'slipping' | 'on_track' | 'new';

export interface MetricRules {
  window: number;
  stopped_after_misses: number;
  slipping_after_misses: number;
  slipping_below_rate: number;
  judge_after_expected: number;
}

/** One of a member's recent expected training dates. */
export interface RecentDate {
  occurrence_id: number;
  start_at: string;
  title: string;
  attended: boolean;
}

export interface MemberMetrics {
  user_id: number;
  name: string;
  level: string | null;
  status: MemberStatus;
  /** The last `rules.window` expected dates, oldest first. */
  recent: RecentDate[];
  recent_attended: number;
  recent_expected: number;
  /** Percent over `recent`; null when nothing was expected yet. */
  rate: number | null;
  missed_in_row: number;
  /** Expected dates in the last year. */
  expected_count: number;
  last_attended_at: string | null;
  /** Every training attended, counting or not. */
  total_attended: number;
  joined_at: string;
}

/** One training date as the BaseShop attended it. */
export interface OccurrencePoint {
  occurrence_id: number;
  training_id: number;
  title: string;
  start_at: string;
  timezone: string;
  expected: number;
  attended: number;
  rate: number | null;
}

export interface MetricsSummary {
  weeks: number;
  member_count: number;
  rate: number | null;
  previous_rate: number | null;
  attended: number;
  expected: number;
  latest: OccurrencePoint | null;
  status_counts: Record<MemberStatus, number>;
  series: OccurrencePoint[];
}

export interface AttendanceMetrics {
  host: PersonRef;
  rules: MetricRules;
  summary: MetricsSummary;
  members: MemberMetrics[];
}

export interface MemberTimelinePoint {
  occurrence_id: number;
  title: string;
  start_at: string;
  timezone: string;
  attended: boolean;
  attended_at: string | null;
  /** The member's rate over the window ending at this date. */
  rolling_rate: number | null;
  /** The BaseShop's rate at this date. */
  baseshop_rate: number | null;
}

export interface MemberDetail extends MemberMetrics {
  host: PersonRef;
  rules: MetricRules;
  timeline: MemberTimelinePoint[];
  /** Trainings attended that were not expected of them (another host's, or not counted). */
  other_attended: number;
}

export interface OccurrencePerson {
  user_id: number;
  name: string;
  level: string | null;
  status: MemberStatus;
  attended_at: string | null;
}

export interface OccurrenceDetail extends OccurrencePoint {
  host: PersonRef;
  attended_people: OccurrencePerson[];
  missed_people: OccurrencePerson[];
}

export type MetricsPeriod = 4 | 8 | 12;
