import type { AssignmentStatus, LifecycleStatus } from './ticket';
import type { DoorCredential } from './door';
import type { PaginatedResponse } from './event';
import type { SearchIn, SearchMatch } from '../utils/purchase-search';

/** One row of the door list — a live ticket plus its arrival state. */
export interface CheckinAttendee {
  id: number;
  ticket_number: string;
  qr_token: string;
  assignment_status: AssignmentStatus;
  /** Assigned / Not assigned (UNASSIGNED) / Transferred, as the Purchases page shows it. */
  shown_status?: AssignmentStatus;
  lifecycle_status: LifecycleStatus;
  holder_name: string;
  holder_first_name: string;
  holder_last_name: string;
  holder_email: string;
  holder_phone: string;
  invoice_number: string;
  /** Imported tickets: the partner purchase (`c1550-141063`) and its invoice number. */
  external_order_reference?: string;
  external_invoice_reference?: string;
  /** Who bought the ticket (the partner purchase's buyer for imports). */
  purchaser_name?: string;
  /** Who sold it: `WB` or the partner (`BSCPro`). */
  channel?: string;
  /** The SMD credited with the ticket. */
  seller_name: string;
  checked_in: boolean;
  checked_in_at: string | null;
  checked_in_by_name: string;
  checkin_notes: string;
  /** `SESSION` when a session scan checked them in (they skipped registration). */
  checkin_source: 'DESK' | 'SESSION' | null;
  /** Title of that session, for `SESSION`. */
  checkin_via_session: string;
  /** `NATIVE` (sold here) or `BSCPRO` (imported from the partner). */
  source?: string;
  /** BSCPro confirmation number, or ''. */
  external_reference?: string;
  /** The ticket is linked to a platform account. */
  holder_linked?: boolean;
  transfer_count?: number;
  /** What was scanned at arrival; '' when not checked in / unknown. */
  checkin_credential?: DoorCredential | '';
  /** This ticket is what the list's search named (highlight it). */
  search_hit?: boolean;
}

/**
 * One purchase block of the door list (`GET .../checkin/purchases/`): the order,
 * its ticket counts and its live tickets (named attendees first). With the
 * `arrived` filter on, `tickets` holds only the matching ones; the counts always
 * cover the whole purchase.
 */
export interface CheckinPurchase {
  id: number;
  invoice_number: string;
  /** Imported purchases: the partner purchase (`c1550-141063`) and its invoice number. */
  external_order_reference: string;
  external_invoice_reference: string;
  purchaser_name: string;
  purchaser_email: string;
  purchaser_phone: string;
  /** Who sold it: `WB` or the partner (`BSCPro`). */
  channel: string;
  /** The SMD credited with the purchase, or ''. */
  seller_name: string;
  ticket_count: number;
  assigned_count: number;
  unassigned_count: number;
  transferred_count: number;
  arrived_count: number;
  tickets: CheckinAttendee[];
  /** With a search: what it matched (buyer, an attendee, a number). */
  search_match?: SearchMatch[];
}

/** `GET .../checkin/purchases/` — a page of purchase blocks. */
export interface CheckinPurchasePage extends PaginatedResponse<CheckinPurchase> {
  /** The viewer may name attendees (purchase-manage access); check-in access alone does not. */
  can_assign?: boolean;
}

/**
 * Response to a check-in. `duplicate` is true when the badge had already been
 * admitted before this scan — the signal staff need to spot a shared ticket.
 */
export interface CheckinScanResult extends CheckinAttendee {
  duplicate: boolean;
  /** What the scan was recognised as. */
  credential?: DoorCredential;
  /** Things staff should look at, e.g. "Ticket was handed over — check ID". */
  warnings?: string[];
  /** The ticket has no linked account — offer "Link profile QR". */
  can_link_account?: boolean;
}

/** Door counters returned by `GET .../checkin/stats/`. */
export interface CheckinStats {
  expected: number;
  arrived: number;
  remaining: number;
  /** Checked in implicitly by a session scan rather than at registration. */
  arrived_via_session: number;
  assigned: number;
  unassigned: number;
}

/** Query params accepted by the attendee list (and the export endpoint). */
export interface CheckinFilters {
  search?: string;
  /** Whose name / email / phone `search` looks at; omitted = everywhere. */
  search_in?: SearchIn;
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
  /** Passed back with `ticket_id` after picking an ambiguous-scan candidate. */
  credential?: DoorCredential;
}

/** Roster download variants offered by `GET .../checkin/export/`. */
export type CheckinExportType = 'xlsx' | 'pdf';
