import type { UserSearchResult } from './types';

/** Best-effort human-readable name for a user, falling back through name fields. */
export function userDisplayName(user: UserSearchResult): string {
  const composed = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return (
    user.full_name?.trim() ||
    user.name?.trim() ||
    composed ||
    user.username?.trim() ||
    user.email?.trim() ||
    `User #${user.id}`
  );
}
