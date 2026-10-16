/** React Query hooks for the Team Support (L1) queue worked by an SMD and their assistant. */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  acknowledgeTeamTicket,
  createTeamComment,
  escalateTeamTicket,
  fetchTeamTicket,
  fetchTeamTickets,
  patchTeamTicket,
  type HelpdeskComment,
  type PaginatedTeamTickets,
  type TeamTicketDetail,
  type TeamTicketStatus,
  type TeamTicketView,
} from '../services/helpdesk-service';
import { QUEUE_COUNTS_KEY } from './use-queue-counts';

/** Query keys for the team queue. */
export const teamTicketKeys = {
  lists: ['helpdesk', 'team-tickets'] as const,
  list: (view: TeamTicketView, page: number) => ['helpdesk', 'team-tickets', view, page] as const,
  detail: (ticketNumber: string) => ['helpdesk', 'team-ticket', ticketNumber] as const,
};

/** One page of the team queue for `view`. */
export function useTeamTickets(view: TeamTicketView, page: number) {
  return useQuery<PaginatedTeamTickets>({
    queryKey: teamTicketKeys.list(view, page),
    queryFn: () => fetchTeamTickets(view, page),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

/** One team ticket; disabled while `ticketNumber` is null. */
export function useTeamTicket(ticketNumber: string | null) {
  return useQuery<TeamTicketDetail>({
    queryKey: teamTicketKeys.detail(ticketNumber ?? ''),
    queryFn: () => fetchTeamTicket(ticketNumber as string),
    enabled: Boolean(ticketNumber),
    // Attachment URLs are signed for ~15 minutes; refetching keeps them fresh.
    staleTime: 60 * 1000,
    retry: false,
  });
}

/** Shared cache refresh after any team ticket action. */
function useRefreshTeamQueue() {
  const queryClient = useQueryClient();
  return (ticketNumber: string, detail?: TeamTicketDetail) => {
    if (detail) queryClient.setQueryData(teamTicketKeys.detail(ticketNumber), detail);
    else void queryClient.invalidateQueries({ queryKey: teamTicketKeys.detail(ticketNumber) });
    void queryClient.invalidateQueries({ queryKey: teamTicketKeys.lists });
    void queryClient.invalidateQueries({ queryKey: QUEUE_COUNTS_KEY });
  };
}

/** Mark a team ticket received (called automatically when one needing action is opened). */
export function useAcknowledgeTeamTicket() {
  const refresh = useRefreshTeamQueue();
  return useMutation<TeamTicketDetail, Error, string>({
    mutationFn: acknowledgeTeamTicket,
    onSuccess: (detail, ticketNumber) => refresh(ticketNumber, detail),
  });
}

/** Reply or add an internal note on a team ticket. */
export function useTeamComment(ticketNumber: string) {
  const refresh = useRefreshTeamQueue();
  return useMutation<HelpdeskComment, Error, { body: string; is_internal: boolean; attachments?: File[] }>({
    mutationFn: (payload) => createTeamComment(ticketNumber, payload),
    onSettled: () => refresh(ticketNumber),
  });
}

/** Set a team ticket's status (In progress / Waiting on user / Resolved). */
export function useTeamTicketStatus(ticketNumber: string) {
  const refresh = useRefreshTeamQueue();
  return useMutation<TeamTicketDetail, Error, TeamTicketStatus>({
    mutationFn: (status) => patchTeamTicket(ticketNumber, { status }),
    onSuccess: (detail) => refresh(ticketNumber, detail),
  });
}

/** Escalate a team ticket to central support (L2). */
export function useEscalateTeamTicket(ticketNumber: string) {
  const refresh = useRefreshTeamQueue();
  return useMutation<TeamTicketDetail, Error, string>({
    mutationFn: (reason) => escalateTeamTicket(ticketNumber, reason),
    onSuccess: (detail) => refresh(ticketNumber, detail),
  });
}
