/** Report and dashboard-summary shapes from `/reports/` and `/ticket-summary/`. */

export interface TicketSummary {
  total_sold: number;
  assigned: number;
  unassigned: number;
  transferred: number;
  checked_in: number;
  remaining_capacity: number | null;
}

/** What one outside ticketing partner collected for the event. */
export interface ExternalPartnerRevenue {
  provider: string;
  label: string;
  revenue: string;
  purchases: number;
}

export interface ReportSummary {
  total_tickets: number;
  /** Shown statuses; they add up to `total_tickets`. */
  assigned: number;
  unassigned: number;
  transferred: number;
  /** Tickets imported from a partner vs sold through WB (absent on older servers). */
  external_tickets?: number;
  wb_tickets?: number;
  /** Imported partner purchases (one order each). */
  external_purchases?: number;
  /** The partner's label, e.g. `BSCPro`; `''` when nothing was imported. */
  external_provider?: string;
  checked_in: number;
  remaining_capacity: number | null;
  collected: string;
  pending: string;
  projected: string;
  refunded: string;
  escrow_balance: string;
  currency: string;
  /**
   * Money partners collected, from their transactions exports. Never part of
   * `collected`, which stays WB-only. All four are absent on older servers.
   */
  external_revenue?: string;
  /** `collected` + `external_revenue`. */
  total_revenue?: string;
  external_partners?: ExternalPartnerRevenue[];
  /** Imported purchases no transactions export has priced yet (they add $0). */
  external_unpriced_purchases?: number;
  pending_count: number;
  unassigned_smd_count: number;
  order_count: number;
}

export interface SmdBreakdownRow {
  seller_id: number | null;
  display_name: string;
  agent_code: string;
  level_code: string;
  /** External team name; empty for our own leaders and the Unassigned row. */
  team_name: string;
  order_count: number;
  ticket_count: number;
  /** Of `ticket_count`, tickets that arrived at the door (absent on older servers). */
  checked_in_count?: number;
  total: string;
}

export interface AddOnStatsRow {
  add_on_id: number;
  product_name: string;
  quantity_sold: number;
  revenue: string;
}
