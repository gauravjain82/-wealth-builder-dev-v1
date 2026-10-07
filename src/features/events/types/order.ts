import type { AssignmentStatus, EventTicket } from './ticket';
import type { SearchIn, SearchMatch } from '../utils/purchase-search';

export type TransactionType = 'STRIPE' | 'CASH' | 'CHECK' | 'CREDIT' | 'COMP' | 'EXTERNAL';
/** `EXTERNAL`: the $0 order of an imported partner (BSCPro) purchase — one per purchase. */
export type OrderStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'CANCELLED' | 'COMP' | 'EXTERNAL';
export type OrderSource = 'PUBLIC' | 'ADMIN' | 'EXTERNAL';

export interface AddOnOrderItem {
  id: number;
  add_on: number;
  product_name: string;
  quantity: number;
  unit_price: string;
  total: string;
}

/** Row shape returned by the nested orders list (annotated counts). */
export interface EventOrderListItem {
  id: number;
  uuid: string;
  invoice_number: string;
  /** EXTERNAL orders: the provider purchase's confirmation (BSCPro `c1550-141063`); `''` otherwise. */
  external_order_reference?: string;
  /** EXTERNAL orders: the provider's own invoice number (e.g. BSCPro `6a4001deccfb6`); `''` otherwise. */
  external_invoice_reference?: string;
  /** Provider confirmations of the order's imported tickets (list rows only). */
  external_references?: string[];
  /** Who sold it: `WB`, or the provider of an imported order (`BSCPro`). */
  channel?: string;
  /** Each ticket's attendee (`''` when nobody is named) and shown status (list rows only). */
  attendees?: OrderAttendee[];
  /** On an imported order: the buyer named on the provider's purchase row. */
  purchaser_first_name: string;
  purchaser_last_name: string;
  purchaser_email: string;
  transaction_type: TransactionType;
  quantity: number;
  total: string;
  currency: string;
  status: OrderStatus;
  source: OrderSource;
  attributed_seller: number | null;
  attributed_seller_name: string | null;
  /** Tickets by shown status; they add up to the order's tickets. */
  assigned_count: number;
  unassigned_count: number;
  transferred_count?: number;
  created_at: string;
  /** With a search: what it matched (buyer, an attendee, a number). */
  search_match?: SearchMatch[];
}

/** One ticket of an order, as the Purchases list shows it. */
export interface OrderAttendee {
  name: string;
  status: AssignmentStatus;
  ticket_number: string;
  /** This ticket is what the search named (highlight it). */
  matched?: boolean;
}

/** Full order from retrieve / create / refund / cancel. */
export interface EventOrder extends EventOrderListItem {
  event: number;
  purchaser_user: number | null;
  purchaser_phone: string;
  pricing_tier_label: string;
  unit_price: string;
  promo_code: string | null;
  discount: string;
  subtotal: string;
  notes: string;
  custom_field_values: Record<string, unknown>;
  tickets: EventTicket[];
  add_on_items: AddOnOrderItem[];
  updated_at: string;
  client_secret?: string;
}

export interface OrderCreatePayload {
  transaction_type: TransactionType;
  quantity: number;
  purchaser_first_name: string;
  purchaser_last_name: string;
  purchaser_email: string;
  purchaser_phone?: string;
  promo_code?: string;
  attributed_seller_id?: number | null;
  notes?: string;
  add_ons?: Array<{ add_on_id: number; quantity: number }>;
}

export interface OrderUpdatePayload {
  purchaser_first_name?: string;
  purchaser_last_name?: string;
  purchaser_email?: string;
  purchaser_phone?: string;
  attributed_seller?: number | null;
  notes?: string;
}

export interface OrderFilters {
  status?: string;
  transaction_type?: string;
  attributed_seller?: number;
  unassigned_seller?: boolean;
  source?: string;
  /** `wb` = sold through WB; `external` = imported from a provider. */
  channel?: string;
  /** Orders with at least one ticket showing this status. */
  ticket_status?: string;
  search?: string;
  /** Whose name / email / phone `search` looks at; omitted = everywhere. */
  search_in?: SearchIn;
  page?: number;
}
