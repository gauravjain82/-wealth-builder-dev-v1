import type { AppointmentListItem } from '@/features/matchup/types';

export type EventType = 'ONE_TIME' | 'RECURRING';
export type BPMFormat = 'IN_PERSON' | 'WEBINAR' | 'WEB_AND_IN_PERSON';
export type OfficeType = 'PERMANENT' | 'TEMPORARY';
export type OccurrenceStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
/** Independent follow-up outcome flags on a guest; multiple may be set at once. */
export type GuestOutcomeField = 'called' | 'left_message' | 'not_interested' | 'reschedule';
/** Section a follow-up interest option belongs to (drives the checkbox groups). */
export type BPMInterestGroup = 'GOALS' | 'BUSINESS' | 'SELF_IMPROVEMENT';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Office {
  id: number;
  name: string;
  office_type: OfficeType;
  /** Person hosting the venue (optional; blank for standing offices). */
  host_name: string;
  /** Contact number in international format (ISD code + number, e.g. "+15551234567"). */
  phone_number: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  latitude: string | null;
  longitude: string | null;
  is_active: boolean;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface OfficePayload {
  name?: string;
  office_type: OfficeType;
  host_name?: string;
  phone_number?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  latitude?: string | null;
  longitude?: string | null;
  is_active?: boolean;
}

export interface BPMEmailTemplate {
  id: number;
  name: string;
  slug: string;
  subject: string;
  body: string;
  is_html: boolean;
  is_active: boolean;
}

export interface BPMEventListItem {
  id: number;
  uuid: string;
  name: string;
  event_type: EventType;
  bpm_format: BPMFormat;
  office: number | null;
  office_detail: Office | null;
  webinar_url: string;
  webinar_url_nickname: string;
  timezone: string;
  start_time: string;
  duration_minutes: number;
  event_date: string | null;
  day_of_week: number | null;
  recurrence_start: string | null;
  recurrence_end: string | null;
  hide_from_baseshop: boolean;
  is_active: boolean;
  created_by: number | null;
  created_by_name: string | null;
  occurrence_count: number;
  created_at: string;
  updated_at: string;
}

export interface BPMOccurrence {
  id: number;
  event: number;
  event_name: string;
  event_type: EventType;
  bpm_format: BPMFormat;
  start_at: string;
  end_at: string;
  timezone: string;
  duration_minutes: number;
  status: OccurrenceStatus;
  guest_count: number;
  checked_in_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserRef {
  id: number;
  name: string | null;
}

/** Company-wide associate hit from GET /api/bpm/inviter-search/. */
export interface InviterSearchHit {
  id: number;
  name: string;
  agency_code: string | null;
  phone: string;
}

/** Baseshop prospect hit from GET /api/bpm/guest-search/. */
export interface GuestProspectSearchHit {
  id: number;
  name: string | null;
  phone: string;
  email: string | null;
  city: string;
  state: string;
}

export interface BPMEventDetail extends BPMEventListItem {
  participating_smds: number[];
  participating_smds_detail: UserRef[];
  trainers: number[];
  trainers_detail: UserRef[];
  checkin_permitted_users: number[];
  checkin_permitted_users_detail: UserRef[];
  email_template: number | null;
  occurrences: BPMOccurrence[];
}

export interface BPMGuestProspectCard {
  id: number;
  name: string | null;
  phone: string;
  email: string | null;
  city: string;
  state: string;
}

export interface BPMGuestNote {
  id: number;
  text: string;
  created_at?: string;
  created_by_name?: string | null;
}

/** Admin-configurable "I am interested in…" option; drives the follow-up checkbox groups. */
export interface BPMInterestOption {
  id: number;
  group: BPMInterestGroup;
  group_display: string;
  label: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_by: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface BPMInterestOptionPayload {
  group?: BPMInterestGroup;
  label?: string;
  slug?: string;
  sort_order?: number;
  is_active?: boolean;
}

/** A guest's follow-up questionnaire result (one record per guest). */
export interface BPMGuestFollowup {
  spouse_name: string;
  /** Selected interest option slugs — map to labels via the interest-options catalog. */
  interests: string[];
  appointment: number | null;
  appointment_detail: AppointmentListItem | null;
  submitted_by: number | null;
  created_at?: string;
  updated_at?: string;
  visited?: boolean;
}

export interface BPMGuest {
  id: number;
  occurrence: number;
  prospect: number | null;
  prospect_detail: BPMGuestProspectCard | null;
  inviter: number | null;
  inviter_name: string | null;
  country?: string;
  state?: string;
  // Independent follow-up outcome flags (any combination may be set).
  called: boolean;
  left_message: boolean;
  not_interested: boolean;
  reschedule: boolean;
  notes: BPMGuestNote[];
  followup: BPMGuestFollowup | null;
  checked_in_at: string | null;
  checked_in_by: number | null;
  checked_in_by_name: string | null;
  visited: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssociateCheckIn {
  id: number;
  user: number;
  user_name: string | null;
  checked_in_at: string;
  checked_in_by: number | null;
  checked_in_by_name: string | null;
  /** 4X4 mission tracker milestones. Green dot when true, red when false. */
  finish_1st_recruit: boolean;
  finish_1st_savings: boolean;
  big_event_1st: boolean;
}

// -- payloads --------------------------------------------------------------

export interface BPMEventPayload {
  name: string;
  event_type: EventType;
  bpm_format: BPMFormat;
  office?: number | null;
  webinar_url?: string;
  webinar_url_nickname?: string;
  timezone: string;
  start_time: string;
  duration_minutes: number;
  event_date?: string | null;
  day_of_week?: number | null;
  recurrence_start?: string | null;
  recurrence_end?: string | null;
  participating_smds?: number[];
  trainers?: number[];
  checkin_permitted_users?: number[];
  email_template?: number | null;
  hide_from_baseshop?: boolean;
}

export interface AddGuestPayload {
  guest_name: string;
  /** Existing prospect (user) id to link this guest to, instead of creating a new prospect. */
  prospect?: number | null;
  phone?: string;
  email?: string;
  inviter?: number | null;
  country?: string;
  state?: string;
  notes?: string;
}

export interface EventFilters {
  event_type?: EventType | '';
  bpm_format?: BPMFormat | '';
  is_active?: boolean;
  search?: string;
  city?: string;
  state?: string;
  segment?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface GoogleStatus {
  connected: boolean;
  google_email?: string | null;
  calendar_id?: string | null;
}

export interface BPMCapabilities {
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_manage_guests: boolean;
  /** bpm_templates:manage — gates the interest-options catalog admin UI. */
  can_manage_templates?: boolean;
}

export interface SaveGuestFollowupPayload {
  guest_id: number;
  /** Interest option slugs. */
  interests?: string[];
  /** Match Up appointment id to link (its contact must be the guest's prospect). */
  appointment_id?: number | null;
  /** Free text → written to the prospect's BPM notes timeline. */
  notes?: string;
}

export interface OccurrenceFilters {
  event?: number;
  status?: string;
  date?: string;
  start_after?: string;
  start_before?: string;
  city?: string;
  state?: string;
  bpm_format?: BPMFormat | '';
  segment?: string;
  page?: number;
  page_size?: number;
}
