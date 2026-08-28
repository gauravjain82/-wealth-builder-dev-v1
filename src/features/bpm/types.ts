export type EventType = 'ONE_TIME' | 'RECURRING';
export type BPMFormat = 'IN_PERSON' | 'WEBINAR' | 'WEB_AND_IN_PERSON';
export type OfficeType = 'PERMANENT' | 'TEMPORARY';
export type OccurrenceStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
/** Independent follow-up outcome flags on a guest; multiple may be set at once. */
export type GuestOutcomeField = 'called' | 'left_message' | 'not_interested' | 'reschedule';

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
