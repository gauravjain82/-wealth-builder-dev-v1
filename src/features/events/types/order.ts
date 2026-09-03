import type { EventTicket } from './ticket';

export type TransactionType = 'STRIPE' | 'CASH' | 'CHECK' | 'CREDIT' | 'COMP';
export type OrderStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'CANCELLED' | 'COMP';
export type OrderSource = 'PUBLIC' | 'ADMIN';

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
  assigned_count: number;
  unassigned_count: number;
  created_at: string;
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
  search?: string;
  page?: number;
}
