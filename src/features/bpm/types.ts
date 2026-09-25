import type { RowColorRule } from '@shared/components/row-colors';

import type { AppointmentListItem } from '@/features/matchup/types';

export type EventType = 'ONE_TIME' | 'RECURRING';
export type BPMFormat = 'IN_PERSON' | 'WEBINAR' | 'WEB_AND_IN_PERSON';
export type LocationKind = 'IN_PERSON' | 'ONLINE';
export type OfficeType = 'PERMANENT' | 'TEMPORARY';
/** @deprecated legacy stored status; read `effective_status` instead. */
export type OccurrenceStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';

/**
 * Every status a BPM or one of its dates can report.
 *
 * SCHEDULED / LIVE / COMPLETED are derived from the clock and never stored;
 * the rest are hard-set by a leader in BPM Schedule.
 */
export type BPMStatus =
  | 'SCHEDULED'
  | 'LIVE'
  | 'COMPLETED'
  | 'ARCHIVED'
  | 'HIDDEN'
  | 'CANCELLED'
  | 'DELETED';

/** The subset of BPMStatus that can be stored. `null` clears the override. */
export type BPMStatusOverride = 'ARCHIVED' | 'HIDDEN' | 'CANCELLED' | 'DELETED';

/** Statuses shown only in BPM Schedule, never in the other sub-tools. */
export const CONCEALED_STATUSES: BPMStatus[] = ['HIDDEN', 'CANCELLED', 'DELETED'];

/** Human labels for the status control. */
export const BPM_STATUS_LABELS: Record<BPMStatus, string> = {
  SCHEDULED: 'Scheduled',
  LIVE: 'Live',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
  HIDDEN: 'Hidden',
  CANCELLED: 'Cancelled',
  DELETED: 'Deleted',
};

/** A file attached to a BPM — in practice the event flyer. */
export interface BPMEventAttachment {
  id: number;
  /** Permanent CDN URL. Empty when the viewer may not view attachments. */
  href: string;
  file_name: string;
  content_type: string;
  /** Image or PDF, so the UI can render it inline rather than just link it. */
  is_previewable: boolean;
  uploaded_by: number | null;
  uploaded_by_name: string | null;
  created_at: string;
}
/**
 * Outcome flags shown on **Guest Invites** — how the pre-event contact went.
 * Independent of each other; any combination may be set.
 */
export type GuestInviteOutcomeField = 'called' | 'left_message' | 'not_interested' | 'reschedule';

/**
 * Outcome flags shown on **Guest Check-In** — what happened on the night.
 *
 * A different question asked of a different person at a different time, which is
 * why the two screens render different Outcome columns rather than one widened
 * list. They share the single `set-guest-flags` setter.
 */
export type GuestCheckinOutcomeField = 'late' | 'stayed_after' | 'blue_card' | 'scheduled_appointment';

/** Either screen's outcome flags — the type a shared toggle handler takes. */
export type GuestOutcomeField = GuestInviteOutcomeField | GuestCheckinOutcomeField;

/** Every boolean the set-guest-flags endpoint accepts: both outcome sets plus Confirmed. */
export type GuestFlagField = GuestOutcomeField | 'confirmed';
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

/** One place a BPM event runs — a physical office or an online room. */
export interface BPMEventLocation {
  id?: number;
  kind: LocationKind;
  office: number | null;
  office_detail?: Office | null;
  webinar_url: string;
  webinar_url_nickname: string;
  /** Optional IANA zone override; blank falls back to the event timezone. */
  timezone: string;
  /** Per-location check-in allow-list (organisational; not enforced yet). */
  checkin_permitted_users: number[];
  checkin_permitted_users_detail?: UserRef[];
  is_active: boolean;
}

/** Compact location summary attached to an occurrence for display. */
export interface OccurrenceLocationDetail {
  id: number;
  kind: LocationKind;
  label: string;
  office_name: string | null;
  city: string | null;
  state: string | null;
}

export interface BPMEventListItem {
  id: number;
  uuid: string;
  name: string;
  event_type: EventType;
  bpm_format: BPMFormat;
  /** @deprecated superseded by `locations`; kept for back-compat. */
  office: number | null;
  office_detail: Office | null;
  locations: BPMEventLocation[];
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
  /** Hard-set status, or null when the status is derived from the clock. */
  status_override: BPMStatusOverride | null;
  effective_status: BPMStatus;
  attachments: BPMEventAttachment[];
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
  location: number | null;
  location_detail: OccurrenceLocationDetail | null;
  /** Per-location check-in allow-list ids (UI auto-scoping; not enforced). */
  checkin_permitted_users: number[];
  start_at: string;
  end_at: string;
  timezone: string;
  duration_minutes: number;
  /** @deprecated legacy column; read `effective_status`. */
  status: OccurrenceStatus;
  /** Hard-set status for this date, or null when derived from the clock. */
  status_override: BPMStatusOverride | null;
  effective_status: BPMStatus;
  /** Archived or deleted — the UI must not offer edits. */
  is_read_only: boolean;
  guest_count: number;
  checked_in_count: number;
  /** Associates checked in here, counted the same way guests are. */
  associate_count: number;
  /** Whether the parent BPM has a flyer, so the UI can offer the button. */
  has_attachments: boolean;
  /**
   * When check-in opens for this date, or null when the window is switched off.
   * Derived server-side from BPM Settings — never re-derive it from `start_at`,
   * or the rule ends up in two places and drifts.
   */
  checkin_opens_at: string | null;
  /** Whether check-in is open right now. Opens early; never closes again. */
  checkin_open: boolean;
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

/**
 * Company-wide prospect hit from GET /api/bpm/prospect-search/. Not scoped to a
 * baseshop or the caller's downline — a coded `agency_code` marks a recruited
 * associate (who belongs in Associate Check-In, not the guest list).
 */
export interface ProspectSearchHit {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string;
  agency_code: string | null;
  recruited_by: number | null;
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

/** A location as sent in an event create/update payload (id targets an existing row). */
export interface BPMEventLocationPayload {
  id?: number;
  kind: LocationKind;
  office?: number | null;
  webinar_url?: string;
  webinar_url_nickname?: string;
  timezone?: string;
  checkin_permitted_users?: number[];
  is_active?: boolean;
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
  /**
   * The associate who physically took the card at the event. Neither the guest's
   * inviter nor `submitted_by` (whoever later typed it in).
   */
  collected_by: number | null;
  collected_by_name: string | null;
  /** Who the guest said they could introduce. Free text, copied off the card. */
  referral_note: string;
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
  /**
   * The **inviter's** leader and SMD. A guest has no leader of their own — the
   * question these columns answer is whose invite this is.
   */
  leader_name: string | null;
  md_name: string | null;
  smd_name: string | null;
  country?: string;
  state?: string;
  // Independent follow-up outcome flags (any combination may be set).
  called: boolean;
  left_message: boolean;
  not_interested: boolean;
  reschedule: boolean;
  /** Someone expects this guest to turn up. A separate axis from the outcomes. */
  confirmed: boolean;
  // On-the-night outcomes, recorded on Guest Check-In.
  late: boolean;
  stayed_after: boolean;
  /** A blue card was collected. Set automatically when the card is saved. */
  blue_card: boolean;
  /** A 1-on-1 was booked off the blue card — what the green row outline reads. */
  scheduled_appointment: boolean;
  /**
   * `reschedule` is only an intention; `rescheduled` means a destination was
   * actually created, which is why the two carry different row colours.
   */
  rescheduled: boolean;
  rescheduled_to_occurrence: number | null;
  rescheduled_to_appointment: number | null;
  /** "Event / date / location", or "1-on-1 · <when>". Null when not rescheduled. */
  rescheduled_to_label: string | null;
  notes: BPMGuestNote[];
  /** Prior contact about this date. `null` means never contacted. */
  messages_summary: BPMGuestMessageSummary | null;
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
  /** The associate's own upline — unlike a guest row, the person *is* the subject. */
  leader_name: string | null;
  md_name: string | null;
  smd_name: string | null;
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
  /** Derived server-side from `locations`; optional to send. */
  bpm_format?: BPMFormat;
  /** Source of truth for where the BPM runs. */
  locations: BPMEventLocationPayload[];
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
  /**
   * Include HIDDEN / CANCELLED / DELETED rows. BPM Schedule and BPM Settings
   * only; the backend ignores it without bpm_schedule/bpm_settings:manage.
   */
  include_concealed?: boolean;
  page?: number;
  page_size?: number;
}

/** City / state options that actually have BPMs in the window on screen. */
export interface DistinctLocations {
  cities: string[];
  states: string[];
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
  /** bpm_schedule:manage — gates CRUD and the status control in BPM Schedule. */
  can_manage_schedule?: boolean;
  /** bpm_settings:manage — gates BPM Settings, including deleted-item recovery. */
  can_manage_settings?: boolean;
}

export interface SaveGuestFollowupPayload {
  guest_id: number;
  /** Interest option slugs. */
  interests?: string[];
  /** Associate who collected the card. Omit to leave as-is; null to clear. */
  collected_by?: number | null;
  /** Free-text referrals from the card. */
  referral_note?: string;
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
  search?: string;
  /**
   * Include HIDDEN / CANCELLED / DELETED rows. BPM Schedule and BPM Settings
   * only; the backend ignores it without bpm_schedule/bpm_settings:manage.
   */
  include_concealed?: boolean;
  page?: number;
  page_size?: number;
}

// -- check-in leaderboards -------------------------------------------------

/** Which population a set of rankings is computed over. */
export type CheckinAudience = 'guest' | 'associate';

/**
 * A rollup dimension. Both audiences carry all four since Phase 6 —
 * `BPMAssociateInvite.invited_by` finally gave the associate audience somebody
 * to rank, where before that associates only checked themselves in.
 */
export type CheckinDimension = 'inviter' | 'leader' | 'md' | 'smd';

/** One person's line in a ranking. */
export interface CheckinRankEntry {
  user_id: number;
  name: string;
  invited: number;
  checked_in: number;
  /** Whole-percent check-in rate, 0 when nobody was invited. */
  ratio: number;
  /** 1-based; ties share a rank. */
  rank: number;
}

/** One card, plus the ranked list its modal shows. */
export interface CheckinDimensionStats {
  key: CheckinDimension;
  label: string;
  /** The top entry — what the card displays. Null when nobody qualifies. */
  leader: CheckinRankEntry | null;
  entries: CheckinRankEntry[];
}

/** Response of GET /api/bpm/occurrences/{id}/checkin-stats/. */
export interface CheckinStats {
  occurrence: number;
  audience: CheckinAudience;
  totals: {
    invited: number;
    checked_in: number;
    ratio: number;
  };
  /** Keyed by dimension; narrowed when the request passed `?dimension=`. */
  dimensions: Partial<Record<CheckinDimension, CheckinDimensionStats>>;
}

/** Response of GET /api/bpm/prospect-match/ — D9's "is this them?" lookup. */
export interface ProspectMatch {
  match:
    | (BPMGuestProspectCard & {
        /** Coded means a recruited associate, who belongs in Associate Check-In. */
        agency_code: string | null;
      })
    | null;
  matched_on: 'email' | 'phone' | null;
}


// -- associate invites (per date) ------------------------------------------

/**
 * One row of Associate Invites.
 *
 * The row is an **associate**, not an invite: the list is the caller's scoped
 * team with this date's invite state joined on, so somebody nobody has worked
 * yet comes back with both boxes unticked rather than being absent. That is why
 * `invited` / `called` are plain booleans and never null.
 *
 * `why` and `goal` are legacy Associate Tracker free text, populated only by the
 * legacy import or by hand in that tracker's inline cells — blank for almost
 * everybody, which is the normal state and not a broken join.
 */
export interface BPMAssociateInviteRow {
  /** The AssociateTracker row id — the table's key. */
  id: number;
  user: number;
  user_id: number;
  name: string | null;
  recruiter_name: string | null;
  /** The associate's own upline: unlike a guest row, the person *is* the subject. */
  leader_name: string | null;
  md_name: string | null;
  smd_name: string | null;
  agency_code: string | null;
  why: string;
  goal: string;
  invited: boolean;
  called: boolean;
  invited_by: number | null;
  invited_by_name: string | null;
  latest_note_text: string | null;
  latest_note_tracker: string | null;
  latest_note_created_by_name: string | null;
  latest_note_created_at: string | null;
}

/** Response of POST /api/bpm/associate-invites/set-flags/. */
export interface BPMAssociateInviteState {
  user_id: number;
  invited: boolean;
  called: boolean;
  invited_by: number | null;
  invited_by_name: string | null;
}

/** Query for GET /api/bpm/associate-invites/. `occurrence` is required. */
export interface AssociateInviteFilters {
  occurrence: number;
  /** Server-side sort key, `-` prefixed for descending. */
  sort?: string;
  /** BASESHOP / SUPERBASE / SUPERTEAM — the TrackerTeamScopeFilter's value. */
  segment?: string;
  page?: number;
  page_size?: number;
  /** The inherited Associate Tracker filters, plus `invited` / `called`. */
  filters?: Record<string, string>;
}

// -- BPM General Settings ---------------------------------------------------

/**
 * The BPM settings singleton.
 *
 * Readable by anyone who can see BPM at all, because two of the values steer
 * what an ordinary user's screen renders: `attachments_download` hides a
 * control, and the check-in window disables a button. Only writing needs
 * `bpm_settings:manage`.
 */
export interface BPMSettings {
  /** Off by default, so existing BPMs keep their always-open check-in. */
  checkin_window_enabled: boolean;
  /** Hours before start that check-in opens. The window never closes again. */
  checkin_window_hours: number;
  qr_host_to_associate: boolean;
  /** Reserved for the emailed-guest-QR feature (D8) — the switch, not the feature. */
  qr_host_to_guest: boolean;
  qr_associate_to_host: boolean;
  /** Off removes the attachment URL from every response — the real gate (D11). */
  attachments_view: boolean;
  /** Off hides the download control only; the CDN URL stays reachable (D11). */
  attachments_download: boolean;
  /** A switch for a sender that does not exist yet (D5). */
  text_event_to_guests: boolean;
  /** A switch for a sender that does not exist yet (D5). */
  email_event_to_guests: boolean;
  updated_by: number | null;
  updated_by_name: string | null;
  updated_at: string;
}

export type BPMSettingsPayload = Partial<
  Omit<BPMSettings, 'updated_by' | 'updated_by_name' | 'updated_at'>
>;

// -- Sending the event to guests -------------------------------------------

/** A reusable SMS body. No subject and no HTML — hence its own model. */
export interface BPMSmsTemplate {
  id: number;
  name: string;
  slug: string;
  body: string;
  /** Billed 160-char segments for the raw template, before placeholders expand. */
  segment_estimate: number;
  is_active: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * How often this guest has already been messaged about this date.
 *
 * `null` on a guest row means **never contacted** — rendered as nothing at all
 * rather than a zero, so the eye is only drawn to people who have already heard
 * from someone.
 *
 * Counts exclude skips: a skip is history worth seeing in the detail view, but
 * counting it would overstate how often this person was actually contacted,
 * which is the number the sender acts on.
 */
export interface BPMGuestMessageSummary {
  email: number;
  sms: number;
  last_sent_at: string | null;
  last_status: string;
}

/** One recorded attempt to message a guest. */
export interface BPMGuestMessageRow {
  id: number;
  channel: 'EMAIL' | 'SMS';
  stage: string;
  /** The outcome recorded when the send was made. */
  status: 'queued' | 'sent' | 'skipped' | 'failed';
  /** Live state from SendGrid / Twilio — a queued email may since have bounced. */
  delivery_status: string;
  detail: string;
  sent_by: number | null;
  sent_by_name: string | null;
  created_at: string;
}

export type BPMSendChannel = 'email' | 'sms';

/** What happened for one guest on one channel. */
export interface BPMSendOutcome {
  guest_id: number;
  name: string;
  channel: BPMSendChannel;
  /** `queued` for email (the SendGrid pass sends it), `sent` for SMS. */
  status: 'queued' | 'sent' | 'skipped' | 'failed';
  /** Why this guest was not reached, phrased for the sender. */
  detail: string;
}

export interface BPMSendReport {
  stage: string;
  counts: Partial<Record<BPMSendOutcome['status'], number>>;
  outcomes: BPMSendOutcome[];
}

export interface BPMSendPayload {
  guest_ids: number[];
  channels: BPMSendChannel[];
  email_template_id?: number | null;
  sms_template_id?: number | null;
}

// -- QR check-in (Phase 8) -------------------------------------------------

/**
 * One QR code, ready to paint.
 *
 * The same shape serves a person's identity code and a date's check-in code:
 * `token` goes in the square, `label` goes under it.
 *
 * `token` is the **bare token**, not a URL — deliberately, so a stranger's phone
 * camera pointed at the screen in a room does nothing. Only the app's own
 * scanner reads these. See `bpm/services/qr.py`.
 */
export interface BPMQrToken {
  token: string;
  label: string;
}

/** Which way a resolved scan pointed. */
export type BPMQrDirection = 'associate_to_host' | 'host_to_associate' | 'host_to_guest';

/**
 * Which table the attendance landed in.
 *
 * Not derivable from `direction`: an associate arrives under either associate
 * direction, and only a guest pass produces a guest. A guest is recorded on
 * `BPMGuest.checked_in_at` and an associate on an `AssociateCheckIn` row — two
 * genuinely different records, which is why the result below carries both keys
 * rather than one polymorphic field.
 */
export type BPMQrSubjectKind = 'associate' | 'guest';

/** What the server made of a scan. */
export interface BPMQrScanResult {
  direction: BPMQrDirection;
  kind: BPMQrSubjectKind;
  /** True when this person was already in the room — reported, not refused. */
  duplicate: boolean;
  occurrence_id: number;
  occurrence_label: string;
  /** Who was checked in. Named by the server so no client has to parse for it. */
  subject_name: string;
  /** Set when `kind` is `associate`; null for a guest. */
  check_in: AssociateCheckIn | null;
  /** Set when `kind` is `guest`; null for an associate. */
  guest: BPMGuest | null;
}

/**
 * A guest's own door pass, as a host sees it.
 *
 * `BPMQrToken` plus the `url` the guest was actually sent — a host asking for a
 * pass is usually asking because the guest never got it, so the link is the part
 * they need. `token` is still the bare token for the on-screen square.
 */
export interface BPMGuestPass extends BPMQrToken {
  url: string;
}

/**
 * The hosted guest pass, as the guest's own browser sees it.
 *
 * Served unauthenticated — the token in the URL is the whole credential — so it
 * deliberately carries no ids of any kind and nothing about anybody else who is
 * coming. `when` is pre-formatted by the server in the BPM's **own** timezone,
 * not the reader's, because a guest travelling to a room needs the room's clock.
 */
export interface PublicBPMGuestPass {
  token: string;
  guest_name: string;
  bpm_name: string;
  when: string;
  timezone: string;
  /** One printable line, or empty for an online BPM. */
  venue: string;
  /** The joining link for an online BPM, or empty for one in a room. */
  webinar_url: string;
  inviter_name: string;
  checked_in: boolean;
  status: string;
}

/**
 * A server-stored row-colour rule.
 *
 * Deliberately the shared `RowColorRule` plus an `id`: the API serialises to
 * that shape exactly, so server rules drop straight into `resolveRowColors`
 * alongside the shipped defaults, and the `id` is only the CRUD handle the
 * settings editor needs.
 */
export interface BPMRowColorRule extends RowColorRule {
  id: number;
}

export type BPMRowColorRulePayload = Omit<BPMRowColorRule, 'id' | 'reserved'>;
