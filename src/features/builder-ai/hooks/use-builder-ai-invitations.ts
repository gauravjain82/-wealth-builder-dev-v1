/**
 * TanStack Query hooks for the BuilderAI Invitations feature.
 *
 * Queries read the seat counter and the sent/received invitation lists;
 * mutations send / accept / decline / cancel invitations, self-add as a builder,
 * and remove a user. Every mutation surfaces a toast and invalidates the
 * BuilderAI query subtree so seats, lists and dashboards refresh.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/store';
import {
  builderInvitationsService,
  type BuilderInviteBox,
  type BuilderInviteSegment,
  type SendInvitationPayload,
} from '../services/builder-ai-invitations-service';

/** Central query-key factory so invalidation stays consistent. */
export const builderInvitationKeys = {
  root: ['builder-ai'] as const,
  invitations: ['builder-ai', 'invitations'] as const,
  list: (box: BuilderInviteBox, segment?: BuilderInviteSegment) =>
    ['builder-ai', 'invitations', box, segment ?? 'all'] as const,
  seats: ['builder-ai', 'invitations', 'seats'] as const,
};

export function useBuilderInvitations(box: BuilderInviteBox, segment?: BuilderInviteSegment) {
  return useQuery({
    queryKey: builderInvitationKeys.list(box, segment),
    queryFn: () => builderInvitationsService.list(box, segment),
  });
}

export function useBuilderSeats() {
  return useQuery({
    queryKey: builderInvitationKeys.seats,
    queryFn: () => builderInvitationsService.seats(),
  });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useSendBuilderInvitation() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  return useMutation({
    mutationFn: (payload: SendInvitationPayload) => builderInvitationsService.send(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: builderInvitationKeys.root });
      addToast({ type: 'success', message: 'Invitation sent.' });
    },
    onError: (error) =>
      addToast({ type: 'error', message: errorMessage(error, 'Failed to send invitation.') }),
  });
}

export function useAcceptBuilderInvitation() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  return useMutation({
    mutationFn: (id: number) => builderInvitationsService.accept(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: builderInvitationKeys.root });
      addToast({ type: 'success', message: 'Invitation accepted.' });
    },
    onError: (error) =>
      addToast({ type: 'error', message: errorMessage(error, 'Failed to accept invitation.') }),
  });
}

export function useDeclineBuilderInvitation() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  return useMutation({
    mutationFn: (id: number) => builderInvitationsService.decline(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: builderInvitationKeys.root });
      addToast({ type: 'info', message: 'Invitation declined.' });
    },
    onError: (error) =>
      addToast({ type: 'error', message: errorMessage(error, 'Failed to decline invitation.') }),
  });
}

export function useCancelBuilderInvitation() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  return useMutation({
    mutationFn: (id: number) => builderInvitationsService.cancel(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: builderInvitationKeys.root });
      addToast({ type: 'info', message: 'Invitation cancelled.' });
    },
    onError: (error) =>
      addToast({ type: 'error', message: errorMessage(error, 'Failed to cancel invitation.') }),
  });
}

export function useSelfAddBuilder() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  return useMutation({
    mutationFn: () => builderInvitationsService.selfAdd(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: builderInvitationKeys.root });
      addToast({ type: 'success', message: 'You were added as a builder.' });
    },
    onError: (error) =>
      addToast({ type: 'error', message: errorMessage(error, 'Failed to add yourself as a builder.') }),
  });
}

export function useRemoveBuilderUser() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  return useMutation({
    mutationFn: (agencyCode: string) => builderInvitationsService.removeUser(agencyCode),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: builderInvitationKeys.root });
      addToast({ type: 'success', message: 'User removed.' });
    },
    onError: (error) =>
      addToast({ type: 'error', message: errorMessage(error, 'Failed to remove user.') }),
  });
}
