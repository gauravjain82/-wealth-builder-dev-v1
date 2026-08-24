/**
 * Types for the Access Control admin feature.
 *
 * Two backend concepts are managed here:
 *  - Functions: a catalog of functional capacities (e.g. TRAINER) a user can hold
 *    (accounts.Function + accounts.UserFunction).
 *  - User permission overrides: per-user GRANT/DENY of a specific permission
 *    (authz.UserPermission), layered on top of role-based permissions.
 */

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** A functional capacity a user can hold. `GET /api/accounts/functions/` */
export interface FunctionItem {
  id: number;
  slug: string;
  label: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateFunctionPayload {
  slug: string;
  label: string;
  description?: string;
  is_active?: boolean;
}

export type UpdateFunctionPayload = Partial<CreateFunctionPayload>;

/** Assignment of a Function to a user. `GET /api/accounts/user-functions/` */
export interface UserFunctionItem {
  id: number;
  user: number;
  function: number;
  function_slug: string;
  assigned_by: number | null;
  assigned_at: string;
}

/** A permission in the catalog. `GET /api/authz/permissions/` */
export interface PermissionItem {
  id: number;
  resource: string;
  action: string;
}

export type PermissionEffect = 'GRANT' | 'DENY';

/** A per-user permission override. `GET /api/authz/user-permissions/` */
export interface UserPermissionItem {
  id: number;
  user: number;
  permission: number;
  permission_label: string;
  effect: PermissionEffect;
  reason: string;
  granted_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserPermissionPayload {
  user: number;
  permission: number;
  effect: PermissionEffect;
  reason?: string;
}

export type UpdateUserPermissionPayload = Partial<Omit<CreateUserPermissionPayload, 'user'>>;

/** Lightweight user shape returned by the user search endpoint. */
export interface UserSearchResult {
  id: number;
  username?: string | null;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  agency_code?: string | null;
}
