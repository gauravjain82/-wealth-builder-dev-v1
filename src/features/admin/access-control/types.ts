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
  permission_resource: string;
  permission_action: string;
  user_name: string | null;
  user_email: string | null;
  user_agency_code: string | null;
  effect: PermissionEffect;
  reason: string;
  /** Protected grants cannot be revoked or turned into a DENY from the console. */
  is_protected: boolean;
  granted_by: number | null;
  granted_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserPermissionPayload {
  user: number;
  permission: number;
  effect: PermissionEffect;
  reason?: string;
}

/** Filters for the cross-user override listing. */
export interface UserPermissionQuery {
  user?: number;
  resource?: string;
  action?: string;
  effect?: PermissionEffect | '';
  search?: string;
  page?: number;
  pageSize?: number;
}

/** `POST /api/authz/user-permissions/bulk-grant/` */
export interface BulkGrantPayload {
  users: number[];
  permissions: number[];
  effect: PermissionEffect;
  reason?: string;
  dry_run?: boolean;
}

export interface BulkGrantResult {
  created: number;
  updated: number;
  unchanged: number;
  skipped_protected: number[];
  dry_run: boolean;
}

/** `POST /api/authz/user-permissions/bulk-revoke/` */
export interface BulkRevokeResult {
  deleted: number;
  skipped_protected: number[];
  not_found: number[];
}

export type UpdateUserPermissionPayload = Partial<Omit<CreateUserPermissionPayload, 'user'>>;

/**
 * A permission granted to an entire level/rank. Grant-only, union semantics:
 * every user at the level gains it, layered on top of role-based permissions.
 * `GET /api/authz/level-permissions/`
 */
export interface LevelPermissionItem {
  id: number;
  level: number;
  level_code: string;
  level_name: string;
  permission: number;
  permission_label: string;
}

export interface CreateLevelPermissionPayload {
  level: number;
  permission: number;
}

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
