/**
 * Domain types for the Product Management UI. Field names mirror the Django
 * `tracker` CompanyProduct model / serializers 1:1.
 */

/** Fixed carrier list (matches CompanyProduct.COMPANY_CHOICES on the backend). */
export const COMPANY_CHOICES: readonly string[] = [
  'AIG',
  'Allianz',
  'Athene',
  'COREBRIDGE (AMS)',
  'Everest',
  'FIDELITY & GUARANTY (AMS)',
  'Franklin Templeton',
  'GLOBAL ATLANTIC',
  'Gerber',
  'Jackson',
  'John Hancock',
  'NATIONAL LIFE GROUP',
  'Nationwide',
  'North American',
  'PacLife',
  'Prudential',
  'Transamerica',
  'Other',
];

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Capability flags from GET /api/tracker/products/my-access/. */
export interface ProductsAccess {
  can_view: boolean;
  can_manage: boolean;
  can_view_history: boolean;
  /** ContentType id of CompanyProduct — used to query the audit history API. */
  content_type_id: number;
}

/** A product row as returned by the admin read serializer. */
export interface Product {
  id: number;
  company_name: string;
  product_name: string;
  product_description: string;
  multiplier: string;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  policy_count: number;
  created_by_username: string | null;
  updated_by_username: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProductPayload {
  company_name: string;
  product_name: string;
  product_description: string;
  multiplier: string;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

/** One audit entry from GET /api/audit/ (immutable change history). */
export interface AuditEntry {
  id: number;
  model: string;
  content_type: number;
  object_id: string;
  object_repr: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  actor: number | null;
  actor_username: string | null;
  actor_repr: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  context: Record<string, unknown>;
  created_at: string;
}
