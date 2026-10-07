// Event sessions (the agenda) and per-session attendance.
// Mirrors `events/serializers/session.py` and `events/views/session.py`.

import type { DoorCredential } from './door';

export type SessionKind = 'SESSION' | 'BREAK' | 'INFO';
export type SessionAccess = 'OPEN' | 'RESTRICTED';
export type SessionCheckinMethod = 'STAFF_SCAN' | 'SELF_SCAN' | 'MANUAL';

/** One agenda line. The room QR token is never in this payload — see `SessionQr`. */
export interface EventSession {
  id: number;
  event: number;
  title: string;
  description: string;
  room: string;
  kind: SessionKind;
  starts_at: string;
  ends_at: string | null;
  /** The session's day in the event's timezone, `yyyy-MM-dd`. */
  local_date: string;
  tracks_attendance: boolean;
  access: SessionAccess;
  /** Shown to attendees and door staff, e.g. "Qualifiers only". */
  restriction_label: string;
  /** Restricted sessions also admit holders at or above this level. */
  min_level: number | null;
  min_level_code: string | null;
  self_checkin_enabled: boolean;
  checkin_opens_minutes_before: number;
  checkin_closes_minutes_after: number;
  /** Listed on the public Agenda section when it is set to show sessions. */
  show_on_agenda: boolean;
  sort_order: number;
  is_active: boolean;
}

export type EventSessionPayload = Partial<
  Omit<EventSession, 'id' | 'event' | 'local_date' | 'min_level_code' | 'is_active'>
>;

/** The code a session's room screen displays. */
export interface SessionQr {
  token: string;
  /** What the QR encodes: a URL a phone camera opens directly. */
  url: string;
}

/** One row of a session's door list. */
export interface SessionAttendee {
  id: number;
  ticket_number: string;
  holder_name: string;
  holder_email: string;
  holder_phone: string;
  invoice_number: string;
  seller_name: string;
  /** Checked in to the event itself (desk, or implicitly by a session scan). */
  event_checked_in: boolean;
  checked_in: boolean;
  checked_in_at: string | null;
  checked_in_by_name: string;
  method: SessionCheckinMethod | null;
  /** Admitted by staff outside the window or off the allow-list. */
  override: boolean;
}

export interface SessionScanResult extends SessionAttendee {
  duplicate: boolean;
  /** This scan also did the event check-in (they skipped registration). */
  event_checkin_created: boolean;
  warnings: string[];
  /** What the scan was recognised as. */
  credential?: DoorCredential;
}

export interface SessionStats {
  expected: number;
  arrived: number;
  remaining: number;
  self_scanned: number;
  overrides: number;
}

export interface SessionAttendanceRow {
  session_id: number;
  title: string;
  room: string;
  starts_at: string;
  ends_at: string | null;
  access: SessionAccess;
  expected: number;
  arrived: number;
}

export interface SessionCheckinPayload {
  scan?: string;
  ticket_id?: number;
  override?: boolean;
  notes?: string;
  /** Passed back with `ticket_id` after picking an ambiguous-scan candidate. */
  credential?: DoorCredential;
}

export interface SessionDoorFilters {
  search?: string;
  arrived?: boolean;
  page?: number;
}

/** A person on a restricted session's allow-list. */
export interface SessionEligibilityEntry {
  id: number;
  user: number | null;
  name: string;
  agent_code: string;
  level_code: string;
  person_email: string;
  /** Live tickets this person holds now — empty means none (or given away). */
  ticket_numbers: string[];
  created_at: string;
}

export interface EligibilityAddResult {
  added: number;
  already: number;
  not_found: string[];
}

/** What an attendee sees after scanning a room code. */
export interface SelfCheckinPreview {
  session_id: number;
  title: string;
  room: string;
  starts_at: string;
  ends_at: string | null;
  event_name: string;
  restriction_label: string;
  has_ticket: boolean;
  ticket_number: string;
  holder_name: string;
  eligible: boolean;
  window_open: boolean;
  self_checkin_enabled: boolean;
  already_checked_in: boolean;
  can_check_in: boolean;
}

export interface SelfCheckinResult {
  session_id: number;
  title: string;
  ticket_number: string;
  checked_in_at: string;
  duplicate: boolean;
  event_checkin_created: boolean;
}

export interface LevelOption {
  id: number;
  code: string;
  name: string;
  rank: number;
}
