export type AssignmentStatus = 'UNASSIGNED' | 'ASSIGNED' | 'TRANSFERRED';
export type LifecycleStatus = 'ACTIVE' | 'CANCELLED' | 'REFUNDED';

export interface EventTicket {
  id: number;
  uuid: string;
  event?: number;
  order?: number;
  ticket_number: string;
  assignment_status: AssignmentStatus;
  lifecycle_status: LifecycleStatus;
  holder_first_name: string;
  holder_last_name: string;
  holder_email: string;
  holder_phone: string;
  holder_user?: number | null;
  attributed_seller?: number | null;
  custom_field_values?: Record<string, unknown>;
  current_owner_user: number | null;
  transfer_count: number;
  qr_token: string;
  is_checked_in?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AssignHolderPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  create_prospect?: boolean;
}

export interface TransferPayload {
  to_user_id?: number | null;
  to_email: string;
  to_label: string;
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

export interface MyTicketsResponse {
  summary: OwnerSummary;
  tickets: EventTicket[];
}
