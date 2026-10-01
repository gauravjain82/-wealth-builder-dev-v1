/**
 * Change history for one person: field edits (leader, recruiter, agency code,
 * phone, …), the changes the system made on its own, and role changes.
 *
 * The person is the whole selection, so it is the key; `signal` is forwarded so
 * switching people cancels the superseded request.
 */

import { useQuery } from '@tanstack/react-query';

import { fetchUserHistory } from '../services/tracker-user-profile-service';

export const userHistoryKey = (userId: number | null) => ['team', 'user-history', userId] as const;

export function useUserHistory(userId: number | null, enabled = true) {
  return useQuery({
    queryKey: userHistoryKey(userId),
    queryFn: ({ signal }) => fetchUserHistory(userId as number, signal),
    enabled: enabled && userId != null,
    staleTime: 30_000,
  });
}
