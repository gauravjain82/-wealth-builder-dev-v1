export type AssignmentStatus = 'UNASSIGNED' | 'ASSIGNED' | 'TRANSFERRED';
export type LifecycleStatus = 'ACTIVE' | 'CANCELLED' | 'REFUNDED';

export interface EventTicket {
  id: number;
  uuid: string;
  event?: number;
  order?: number;
  ticket_number: string;
  assignment_status: AssignmentStatus;
  /**
   * What staff see: ASSIGNED, UNASSIGNED ("Not assigned") or TRANSFERRED (changed
   * hands on WB or at the provider). Prefer this over `assignment_status` for display.
   */
  shown_status?: AssignmentStatus;
  lifecycle_status: LifecycleStatus;
  holder_first_name: string;
  holder_last_name: string;
  holder_email: string;
  holder_phone: string;
  holder_user?: number | null;
  attributed_seller?: number | null;
  /** The SMD this ticket is credited to, and their external team (if any). */
  attributed_seller_name?: string;
  attributed_seller_team?: string;
  custom_field_values?: Record<string, unknown>;
  current_owner_user: number | null;
  transfer_count: number;
  qr_token: string;
  is_checked_in?: boolean;
  /** `NATIVE` (sold here) or `BSCPRO` (imported from the partner). */
  source?: string;
  /** BSCPro confirmation number, or ''. */
  external_reference?: string;
  created_at: string;
  updated_at?: string;
}

export interface AssignHolderPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  create_prospect?: boolean;
  /** The SMD the holder is with — re-credits the ticket. */
  attributed_seller_id?: number | null;
}

export interface TransferPayload {
  to_user_id?: number | null;
  to_email?: string;
  to_label?: string;
  /** The SMD the recipient is with — re-credits the ticket. */
  attributed_seller_id?: number | null;
  /** Managers only: the recipient as typed (blanks are filled from a picked account). */
  to_first_name?: string;
  to_last_name?: string;
  to_phone?: string;
  /** Managers only: add the recipient as a prospect when no account matches. */
  create_prospect?: boolean;
  /** Managers only: save the typed details onto a picked prospect. */
  update_contact?: boolean;
}

/** One row of `GET events/{id}/people/search/` — who a ticket can go to. */
export interface PersonSearchHit {
  id: number;
  full_name: string;
  first_name: string;
  last_name: string;
  agency_code: string;
  kind: 'agent' | 'prospect';
  /** In full for a prospect; masked (`a***@domain`) for an agent. */
  email: string;
  /** In full for a prospect; last four digits only for an agent. */
  phone: string;
  has_email: boolean;
  has_phone: boolean;
  /** The nearest SMD up their recruiting line that is on this event's list. */
  upline_seller: { id: number; display_name: string } | null;
}

export interface TicketHistory {
  assignments: Array<{
    holder_first_name: string;
    holder_last_name: string;
    holder_email: string;
    assigned_by__first_name?: string;
    assigned_by: string;
    created_at: string;
  }>;
  transfers: Array<{
    from_label: string;
    to_label: string;
    to_email: string;
    transferred_by__first_name?: string;
    transferred_by: string;
    created_at: string;
  }>;
}

export interface OwnerSummary {
  total_owned: number;
  assigned: number;
  unassigned: number;
  transferred: number;
  checked_in: number;
}

/** A ticket the user is the named attendee of (owned or not — e.g. BSCPro). */
export interface HeldTicket extends EventTicket {
  can_hand_over: boolean;
  /** Why hand-over is unavailable, when `can_hand_over` is false. */
  hand_over_blocked_reason: string;
}

export interface MyTicketsResponse {
  summary: OwnerSummary;
  tickets: EventTicket[];
  held_tickets?: HeldTicket[];
}

/**
 * Name change: the ticket (and its confirmation) stays, the named attendee
 * becomes this person. `POST /api/events/tickets/{id}/hand-over/`.
 */
export interface HandOverPayload {
  /** Blank only when a manager picked an account (`to_user_id`). */
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  attributed_seller_id?: number;
  reason?: string;
  /** Managers only: the account picked in the person search. */
  to_user_id?: number;
  /** Managers only: add the new attendee as a prospect when no account matches. */
  create_prospect?: boolean;
  /** Managers only: save the typed details onto a picked prospect. */
  update_contact?: boolean;
}
