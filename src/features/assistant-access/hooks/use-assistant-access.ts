/**
 * React Query hooks for the SMD's assistant login (`/api/assistant-access/me/`).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchMyAssistantAccess,
  resendAssistantInvite,
  revokeAssistantAccess,
} from '../services/assistant-access-service';

export const assistantAccessKeys = {
  me: ['assistant-access', 'me'] as const,
};

/** The SMD's assistant access; pass `enabled: false` to skip (e.g. in assistant mode). */
export function useMyAssistantAccess(enabled = true) {
  return useQuery({
    queryKey: assistantAccessKeys.me,
    queryFn: ({ signal }) => fetchMyAssistantAccess(signal),
    enabled,
    staleTime: 60_000,
  });
}

/** Re-send the invite email, then refetch the access. */
export function useResendAssistantInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resendAssistantInvite,
    onSettled: () => queryClient.invalidateQueries({ queryKey: assistantAccessKeys.me }),
  });
}

/** Revoke the assistant's login, then refetch the access. */
export function useRevokeAssistantAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeAssistantAccess,
    onSettled: () => queryClient.invalidateQueries({ queryKey: assistantAccessKeys.me }),
  });
}
