import type {
  CreateLevelPermissionPayload,
  LevelPermissionItem,
  PaginatedResponse,
} from '../types';
import { request, toArray } from './access-control-service';

/**
 * CRUD for level/rank permission grants (authz.LevelPermission). Grant-only:
 * a grant to MD applies to every user whose level is MD. Mirrors the
 * user-permission service, but the subject is a Level rather than a user.
 */

export async function listLevelPermissions(): Promise<LevelPermissionItem[]> {
  const data = await request<PaginatedResponse<LevelPermissionItem> | LevelPermissionItem[]>(
    '/api/authz/level-permissions/',
  );
  return toArray<LevelPermissionItem>(data);
}

export function createLevelPermission(
  payload: CreateLevelPermissionPayload,
): Promise<LevelPermissionItem> {
  return request<LevelPermissionItem>('/api/authz/level-permissions/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteLevelPermission(id: number): Promise<void> {
  return request<void>(`/api/authz/level-permissions/${id}/`, { method: 'DELETE' });
}
