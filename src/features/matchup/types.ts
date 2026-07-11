export type AppointmentKind = 'REQUEST_TRAINER' | 'PERSONAL';

export type AppointmentStatus =
  | 'REQUESTED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'DONE'
  | 'RESCHEDULED'
  | 'NOT_INTERESTED'
  | 'CANCELLED'
  | 'DECLINED';

export type LocationType = 'VIRTUAL' | 'PHYSICAL';

export interface MatchupStatusMeta {
  value: AppointmentStatus;
  label: string;
  color: string;
}

export interface MatchupActionRequiredResponse {
  assign?: AppointmentListItem[];
  accept?: AppointmentListItem[];
  complete?: AppointmentListItem[];
}

export interface AppointmentType {
  id: number;
  name: string;
  slug: string;
  color?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface PersonCard {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  spouse_name?: string;
  spouse_phone?: string;
  agency_code?: string;
  city?: string;
  state?: string;
}

export interface AppointmentResult {
  appointment_happened: boolean;
  ama_completed: boolean;
  fna_taken: boolean;
  second_appointment_scheduled: boolean;
  referrals: number;
  invited_to_bpm: boolean;
  trainee_edified_trainer: 'YES' | 'NO' | 'KINDA' | '';
  made_sale: 'YES' | 'NOT_YET' | '';
  submitted_by?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AppointmentAssignment {
  id: number;
  trainer: number;
  trainer_name: string;
  assigned_by?: number;
  assigned_by_name?: string;
  status: string;
  decline_reason?: string;
  created_at: string;
  responded_at?: string | null;
}

export interface AppointmentReschedule {
  id: number;
  previous_start_at: string;
  previous_duration_minutes: number;
  previous_timezone: string;
  new_start_at: string;
  new_duration_minutes: number;
  new_timezone: string;
  reason?: string;
  rescheduled_by?: number;
  rescheduled_by_name?: string;
  created_at: string;
}

export interface AppointmentListItem {
  id: number;
  uuid?: string;
  kind: AppointmentKind;
  status: AppointmentStatus;
  status_color?: string;
  status_label?: string;
  start_at: string;
  end_at: string;
  timezone: string;
  duration_minutes: number;
  types: AppointmentType[];
  location_type: LocationType;
  url?: string;
  url_nickname?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  contact?: number | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_spouse_name?: string | null;
  trainee?: number | null;
  trainee_name?: string | null;
  trainee_phone?: string | null;
  assigned_to?: number | null;
  assigned_to_name?: string | null;
  assigned_to_detail?: PersonCard | null;
  created_by?: number | null;
  created_by_name?: string | null;
  has_result?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AppointmentDetail extends Omit<AppointmentListItem, 'types'> {
  types: number[];
  types_detail: AppointmentType[];
  address?: string;
  zip_code?: string;
  country?: string;
  contact_detail?: PersonCard | null;
  trainee_detail?: PersonCard | null;
  assigned_to_detail?: PersonCard | null;
  assigned_by?: number | null;
  result?: AppointmentResult | null;
  assignments?: AppointmentAssignment[];
  reschedules?: AppointmentReschedule[];
  google_event_id?: string | null;
}

export interface CalendarAppointment {
  id: number;
  kind: AppointmentKind;
  status: AppointmentStatus;
  status_color?: string;
  status_label?: string;
  start_at: string;
  end_at: string;
  timezone: string;
  location_type: LocationType;
  contact_name?: string | null;
  trainee_name?: string | null;
  assigned_to?: number | null;
  assigned_to_name?: string | null;
  assigned_to_detail?: PersonCard | null;
}

export interface MatchupMetrics {
  by_status: Partial<Record<AppointmentStatus, number>>;
  total: number;
  done: number;
  rescheduled: number;
  not_interested: number;
  sales: number;
  recruits: number;
}

export interface TrainerCandidate {
  id: number;
  name: string;
  agency_code?: string;
  phone?: string;
  busy: Array<{
    start_at: string;
    end_at: string;
    timezone: string;
    status: AppointmentStatus;
  }>;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AppointmentFilters {
  preset?: string;
  status?: string;
  kind?: AppointmentKind | '';
  types?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  start_after?: string;
  start_before?: string;
}

export interface CreateAppointmentPayload {
  kind: AppointmentKind;
  start_at: string;
  timezone: string;
  duration_minutes: number;
  types: number[];
  location_type: LocationType;
  url?: string;
  url_nickname?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  contact?: number | null;
  contact_phone?: string;
  contact_spouse_name?: string;
  trainee?: number | null;
  trainee_phone?: string;
}

export type UpdateAppointmentPayload = Partial<CreateAppointmentPayload>;

export interface CompleteAppointmentPayload {
  appointment_happened?: boolean;
  ama_completed?: boolean;
  fna_taken?: boolean;
  second_appointment_scheduled?: boolean;
  referrals?: number;
  invited_to_bpm?: boolean;
  trainee_edified_trainer?: 'YES' | 'NO' | 'KINDA' | '';
  made_sale?: 'YES' | 'NOT_YET' | '';
  notes?: string;
}

export interface GoogleStatus {
  connected: boolean;
  google_email?: string | null;
  calendar_id?: string | null;
}
