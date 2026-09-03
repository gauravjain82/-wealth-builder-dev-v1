/**
 * Types for the unauthenticated public event surface (Phase 2).
 *
 * These mirror `events/serializers/public.py` exactly. Kept separate from
 * `types/event.ts` (the authenticated builder's shape) because the backend
 * deliberately splits those serializers — the public payload is a different,
 * narrower contract, not a subset of the admin one.
 *
 * Decimal fields arrive from DRF as strings and are typed as such.
 */

import type {
  EventAddOn,
  EventCustomField,
  EventProductPartner,
  EventSpeaker,
  PricingTier,
} from './config';

/** Why tickets are or aren't currently purchasable. */
export type SalesReason = 'OPEN' | 'NOT_STARTED' | 'ENDED' | 'SOLD_OUT' | 'NO_TIER';

/** Live purchasability of an event, computed server-side. */
export interface SalesState {
  is_open: boolean;
  reason: SalesReason;
  message: string;
  /** `null` when the event has no `max_tickets` (uncapped). */
  tickets_remaining: number | null;
  /** Per-transaction limit, already clamped by remaining capacity. */
  max_per_order: number;
}

/** The tier a single-ticket purchase resolves to right now. */
export interface CurrentTier {
  id: number;
  label: string;
  price: string;
  expiration_date: string | null;
  multi_ticket_min_qty: number | null;
  multi_ticket_price: string | null;
}

/** A tracked seller offered in the "who referred you" selector. */
export interface PublicSeller {
  id: number;
  display_name: string;
  agent_code: string;
  level_code: string;
}

/** The full landing-page payload — one request renders the whole page. */
export interface PublicEvent {
  uuid: string;
  shortcut: string;
  name: string;
  begin_at: string | null;
  end_at: string | null;
  timezone: string;
  show_countdown: boolean;
  sales_start_at: string | null;
  sales_stop_at: string | null;
  about: string;
  notes: string;
  contact_email: string;
  show_email: boolean;
  location_name: string;
  venue_name: string;
  address: string;
  location_phone: string;
  location_details: string;
  book_room_url: string;
  design_type: 'SIMPLE' | 'BIG';
  brand_color: string;
  disable_banner_bg_color: boolean;
  event_video_url: string;
  payment_currency: string;
  price_display_mode: 'CURRENT_ONLY' | 'CURRENT_AND_EXPIRATION';
  per_transaction_limit: number;
  refund_policy: string;
  allow_transfers: boolean;
  allow_multiple_transfers: boolean;
  stop_transfer_at: string | null;
  track_by: 'SMD' | 'NET_CEO_MD' | 'DONT_TRACK' | 'LEADER';
  show_seller_rankings: boolean;
  logo_url: string | null;
  event_banner_url: string | null;
  location_banner_url: string | null;
  contact_banner_url: string | null;
  video_bg_banner_url: string | null;
  flyer_url: string | null;
  agenda_url: string | null;
  pricing_tiers: PricingTier[];
  speakers: EventSpeaker[];
  partners: EventProductPartner[];
  add_ons: EventAddOn[];
  custom_fields: EventCustomField[];
  /** Empty when `track_by` is `DONT_TRACK`, so the selector can just hide. */
  sellers: PublicSeller[];
  current_tier: CurrentTier | null;
  sales_state: SalesState;
}

/** Result of a promo-code preview. Invalid codes come back as 200 + `valid:false`. */
export interface PromoPreview {
  valid: boolean;
  code?: string;
  discount_type?: 'FLAT' | 'PERCENTAGE' | 'FIXED_PRICE';
  unit_price?: string;
  discounted_unit_price?: string;
  total_discount?: string;
  message?: string;
}

/** A requested add-on line in a checkout payload. */
export interface CheckoutAddOnSpec {
  add_on_id: number;
  quantity: number;
}

/**
 * Guest checkout payload.
 *
 * Note what is absent: price, status, and transaction type are never sent —
 * the server prices the order and always creates a Stripe payment.
 */
export interface CheckoutPayload {
  quantity: number;
  purchaser_first_name: string;
  purchaser_last_name: string;
  purchaser_email: string;
  purchaser_phone?: string;
  promo_code?: string;
  attributed_seller_id?: number | null;
  add_ons?: CheckoutAddOnSpec[];
  /** Keyed by custom-field id (as a string). */
  custom_field_values?: Record<string, string | number | boolean>;
}

/** Server response to checkout — carries the PaymentIntent client secret. */
export interface CheckoutResult {
  order_uuid: string;
  invoice_number: string;
  status: string;
  quantity: number;
  unit_price: string;
  discount: string;
  subtotal: string;
  total: string;
  currency: string;
  client_secret: string | null;
}

/** A ticket as shown to its purchaser (post-checkout or after a claim). */
export interface PublicOrderTicket {
  id: number;
  ticket_number: string;
  assignment_status: 'UNASSIGNED' | 'ASSIGNED' | 'TRANSFERRED';
  lifecycle_status: 'ACTIVE' | 'CANCELLED' | 'REFUNDED';
  holder_first_name: string;
  holder_last_name: string;
  holder_email: string;
  holder_phone: string;
  holder_name: string;
  transfer_count: number;
  qr_token: string;
}

/**
 * Order status polled after Stripe confirms.
 *
 * Tickets are issued by the `payment_intent.succeeded` webhook, so `status`
 * stays `PENDING` and `tickets` stays empty for a moment after payment.
 */
export interface PublicOrderStatus {
  uuid: string;
  invoice_number: string;
  status: 'PENDING' | 'PAID' | 'REFUNDED' | 'CANCELLED' | 'COMP';
  quantity: number;
  unit_price: string;
  discount: string;
  subtotal: string;
  total: string;
  currency: string;
  purchaser_first_name: string;
  purchaser_last_name: string;
  purchaser_email: string;
  event_name: string;
  event_shortcut: string;
  tickets: PublicOrderTicket[];
  created_at: string;
}

/** The hosted ticket page payload (addressed by `qr_token`). */
export interface PublicTicket {
  ticket_number: string;
  qr_token: string;
  assignment_status: 'UNASSIGNED' | 'ASSIGNED' | 'TRANSFERRED';
  lifecycle_status: 'ACTIVE' | 'CANCELLED' | 'REFUNDED';
  holder_name: string;
  holder_email: string;
  is_checked_in: boolean;
  event_name: string;
  event_shortcut: string;
  event_begin_at: string | null;
  event_end_at: string | null;
  event_timezone: string;
  venue_name: string;
  location_name: string;
  address: string;
  brand_color: string;
  logo_url: string | null;
}

/** The email + invoice-number ownership proof, re-sent with every action. */
export interface ClaimProof {
  email: string;
  invoice_number: string;
}

/** Result of a claim — also returned by assign and transfer, so the UI can refresh in place. */
export interface ClaimResult {
  invoice_number: string;
  event_name: string;
  purchaser_name: string;
  allow_transfers: boolean;
  transfer_window_open: boolean;
  allow_multiple_transfers: boolean;
  tickets: PublicOrderTicket[];
}

/** Payload for naming the attendee on a claimed ticket. */
export interface PublicAssignPayload extends ClaimProof {
  ticket_id: number;
  first_name: string;
  last_name: string;
  holder_email: string;
  phone?: string;
}

/** Payload for handing a claimed ticket to someone else. */
export interface PublicTransferPayload extends ClaimProof {
  ticket_id: number;
  to_email: string;
  to_name?: string;
}
