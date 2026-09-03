/** Report and dashboard-summary shapes from `/reports/` and `/ticket-summary/`. */

export interface TicketSummary {
  total_sold: number;
  assigned: number;
  unassigned: number;
  transferred: number;
  checked_in: number;
  remaining_capacity: number | null;
}

export interface ReportSummary {
  total_tickets: number;
  assigned: number;
  unassigned: number;
  transferred: number;
  checked_in: number;
  remaining_capacity: number | null;
  collected: string;
  pending: string;
  projected: string;
  refunded: string;
  escrow_balance: string;
  currency: string;
  pending_count: number;
  unassigned_smd_count: number;
  order_count: number;
}

export interface SmdBreakdownRow {
  seller_id: number | null;
  display_name: string;
  agent_code: string;
  level_code: string;
  order_count: number;
  ticket_count: number;
  total: string;
}

export interface AddOnStatsRow {
  add_on_id: number;
  product_name: string;
  quantity_sold: number;
  revenue: string;
}
