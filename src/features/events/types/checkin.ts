import type { AssignmentStatus, LifecycleStatus } from './ticket';

/** One row of the door list — a live ticket plus its arrival state. */
export interface CheckinAttendee {
  id: number;
  ticket_number: string;
  qr_token: string;
  assignment_status: AssignmentStatus;
  lifecycle_status: LifecycleStatus;
  holder_name: string;
  holder_first_name: string;
  holder_last_name: string;
  holder_email: string;
  holder_phone: string;
  invoice_number: string;
  seller_name: string;
  checked_in: boolean;
  checked_in_at: string | null;
  checked_in_by_name: string;
  checkin_notes: string;
}

/**
 * Response to a check-in. `duplicate` is true when the badge had already been
 * admitted before this scan — the signal staff need to spot a shared ticket.
 */
export interface CheckinScanResult extends CheckinAttendee {
  duplicate: boolean;
}

/** Door counters returned by `GET .../checkin/stats/`. */
export interface CheckinStats {
  expected: number;
  arrived: number;
  remaining: number;
  assigned: number;
  unassigned: number;
}

/** Query params accepted by the attendee list (and the export endpoint). */
export interface CheckinFilters {
  search?: string;
  /** `true` = arrived only, `false` = not yet arrived, omitted = everyone. */
  arrived?: boolean;
  assignment_status?: AssignmentStatus;
  page?: number;
  page_size?: number;
}

/**
 * Identifies the ticket to admit. Exactly one identifier is required; `scan`
 * accepts a QR payload (the hosted-ticket URL), a bare token, or a typed
 * ticket number and is resolved server-side.
 */
export interface CheckinPayload {
  scan?: string;
  ticket_id?: number;
  qr_token?: string;
  ticket_number?: string;
  notes?: string;
}

/** Roster download variants offered by `GET .../checkin/export/`. */
export type CheckinExportType = 'xlsx' | 'pdf';
