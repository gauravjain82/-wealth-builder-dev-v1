export interface PricingTier {
  id: number;
  label: string;
  price: string;
  active_from: string | null;
  expiration_date: string | null;
  multi_ticket_min_qty: number | null;
  multi_ticket_price: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface EventSpeaker {
  id: number;
  name: string;
  title: string;
  image_blob_name: string | null;
  description: string;
  website: string;
  instagram: string;
  twitter: string;
  sort_order: number;
  is_active: boolean;
}

export interface EventProductPartner {
  id: number;
  company_name: string;
  level: 'DIAMOND' | 'GOLD' | 'SILVER' | 'BRONZE';
  logo_blob_name: string | null;
  description: string;
  website: string;
  sort_order: number;
  is_active: boolean;
}

export interface EventAddOn {
  id: number;
  product_name: string;
  unit_price: string;
  description: string;
  product_type: 'MERCHANDISE' | 'MEAL' | 'EXPERIENCE' | 'OTHER';
  stock: number | null;
  image_blob_name: string | null;
  is_active: boolean;
  sold: number;
}

export interface EventPromoCode {
  id: number;
  code: string;
  discount_type: 'FLAT' | 'PERCENTAGE' | 'FIXED_PRICE';
  discount_value: string;
  description: string;
  start_date: string | null;
  expiration_date: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
}

export interface EventTrackedSeller {
  id: number;
  display_name: string;
  agent_code: string;
  level_code: string;
  nearest_upline_name: string;
  matched_user: number | null;
  is_active: boolean;
}

export interface EventCustomField {
  id: number;
  name: string;
  field_type: 'TEXT' | 'SELECT' | 'CHECKBOX' | 'EMAIL' | 'PHONE' | 'NUMBER';
  required: boolean;
  description: string;
  options: string[];
  sort_order: number;
}
