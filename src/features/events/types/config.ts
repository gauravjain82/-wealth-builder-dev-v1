export interface QuantityBreak {
  id?: number;
  min_qty: number;
  unit_price: string;
}

export interface PricingTier {
  id: number;
  label: string;
  price: string;
  active_from: string | null;
  expiration_date: string | null;
  /** "`min_qty` or more tickets cost `unit_price` each", lowest quantity first. */
  quantity_breaks: QuantityBreak[];
  sort_order: number;
  is_active: boolean;
}

/** `keynote` speakers render larger, in their own group. */
export type SpeakerGroup = 'keynote' | 'speaker';

export interface EventSpeaker {
  id: number;
  name: string;
  title: string;
  /** Absent from a backend that predates groups; treat as `speaker`. */
  group?: SpeakerGroup;
  image_blob_name: string | null;
  /** Signed photo URL (null when no photo uploaded). */
  image_url: string | null;
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
  /** Signed logo URL (null when no logo uploaded). */
  logo_url: string | null;
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
  /** Signed image URL (null when no image uploaded). */
  image_url: string | null;
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
  /** Set when the seller came from the external teams directory. */
  external_member: number | null;
  /** The external team's name; empty for our own leaders. */
  team_name: string;
  sort_order: number;
  is_active: boolean;
}

/** Rank of a leader from an external team (values match our Level codes). */
export type ExternalLeaderLevel = 'SMD' | 'CEO-MD' | 'EVC';

/** An SMD / CEO-MD from a team outside WealthBuilder. */
export interface ExternalTeamMember {
  id: number;
  team: number;
  team_name: string;
  name: string;
  agent_code: string;
  level_code: ExternalLeaderLevel;
  is_active: boolean;
}

/** A team outside WealthBuilder that sells tickets to our events. */
export interface ExternalTeam {
  id: number;
  name: string;
  notes: string;
  /** Active members only. */
  members: ExternalTeamMember[];
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
