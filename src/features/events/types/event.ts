export interface BigEventListItem {
  id: number;
  uuid: string;
  name: string;
  shortcut: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  begin_at: string;
  end_at: string;
  location_name: string;
  venue_name: string;
  created_at: string;
}

export interface BigEvent extends BigEventListItem {
  // Core
  timezone: string;
  show_countdown: boolean;
  sales_start_at: string | null;
  sales_stop_at: string | null;
  notes: string;
  about: string;
  contact_email: string;
  show_email: boolean;
  invoice_cc_emails: string[];
  flyer_blob_name: string | null;
  agenda_blob_name: string | null;
  confirmation_email_template: string;
  track_by: 'SMD' | 'NET_CEO_MD' | 'DONT_TRACK' | 'LEADER';
  show_seller_rankings: boolean;
  // Location
  address: string;
  location_phone: string;
  location_details: string;
  book_room_url: string;
  // Design (inlined)
  design_type: 'SIMPLE' | 'BIG';
  brand_color: string;
  disable_banner_bg_color: boolean;
  logo_blob_name: string | null;
  event_banner_blob_name: string | null;
  location_banner_blob_name: string | null;
  contact_banner_blob_name: string | null;
  video_bg_banner_blob_name: string | null;
  event_video_url: string;
  // Signed preview URLs (read-only; the detail serializer signs each blob).
  logo_url: string | null;
  event_banner_url: string | null;
  location_banner_url: string | null;
  contact_banner_url: string | null;
  video_bg_banner_url: string | null;
  flyer_url: string | null;
  agenda_url: string | null;
  // Payment config (inlined)
  payment_provider: 'STRIPE';
  payment_currency: string;
  stripe_account_id: string | null;
  // Ticket settings (inlined)
  max_tickets: number | null;
  per_transaction_limit: number;
  stop_transfer_at: string | null;
  price_display_mode: 'CURRENT_ONLY' | 'CURRENT_AND_EXPIRATION';
  // Policy (inlined)
  allow_transfers: boolean;
  allow_multiple_transfers: boolean;
  refund_policy: string;
  // Audit
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
}

export interface BigEventPayload {
  name?: string;
  shortcut?: string;
  begin_at?: string | null;
  end_at?: string | null;
  timezone?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  [key: string]: unknown;
}

export interface EventFilters {
  status?: string;
  search?: string;
  page?: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
