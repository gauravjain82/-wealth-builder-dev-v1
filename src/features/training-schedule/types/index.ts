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
}

/** The fields an edit may change; the dates of a series are fixed once created. */
export type TrainingPatch = Pick<
  TrainingInput,
  'title' | 'description' | 'meeting_url' | 'color' | 'timezone' | 'start_time' | 'duration_minutes'
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
  tracker: { is_training: boolean; training_date: string | null };
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
  choices: {
    levels: { code: string; name: string }[];
    inherited_delete_policy: Choice[];
    completed_delete_policy: Choice[];
  };
}

export type ScheduleSettingsPatch = Partial<Omit<ScheduleSettings, 'choices'>>;
