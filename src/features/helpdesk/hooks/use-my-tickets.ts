/** React Query hooks for the signed-in user's own helpdesk tickets ("My tickets"). */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createMyTicket,
  fetchMyTicket,
  fetchMyTickets,
  replyToMyTicket,
  type CreateMyTicketPayload,
  type MyTicketComment,
  type MyTicketDetail,
  type PaginatedMyTickets,
} from '../services/helpdesk-service';

/** Query keys for the "My tickets" data. */
export const myTicketKeys = {
  all: ['helpdesk', 'my-tickets'] as const,
  list: (page: number) => ['helpdesk', 'my-tickets', page] as const,
  detailAll: ['helpdesk', 'my-ticket'] as const,
  detail: (ticketNumber: string) => ['helpdesk', 'my-ticket', ticketNumber] as const,
};

/** One page of the user's tickets. */
export function useMyTickets(page: number) {
  return useQuery<PaginatedMyTickets>({
    queryKey: myTicketKeys.list(page),
    queryFn: () => fetchMyTickets(page),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

/** One of the user's tickets; disabled while `ticketNumber` is null. */
export function useMyTicket(ticketNumber: string | null) {
  return useQuery<MyTicketDetail>({
    queryKey: myTicketKeys.detail(ticketNumber ?? ''),
    queryFn: () => fetchMyTicket(ticketNumber as string),
    enabled: Boolean(ticketNumber),
    // Attachment URLs are signed for ~15 minutes; refetching keeps them fresh.
    staleTime: 60 * 1000,
    retry: false,
  });
}

/** Create a ticket from the "Report a problem" dialog and refresh the list. */
export function useCreateMyTicket() {
  const queryClient = useQueryClient();
  return useMutation<MyTicketDetail, Error, CreateMyTicketPayload>({
    mutationFn: createMyTicket,
    onSuccess: (ticket) => {
      queryClient.setQueryData(myTicketKeys.detail(ticket.ticket_number), ticket);
      void queryClient.invalidateQueries({ queryKey: myTicketKeys.all });
    },
  });
}

/** Reply on one of the user's tickets and refresh that ticket and the list. */
export function useReplyToMyTicket(ticketNumber: string) {
  const queryClient = useQueryClient();
  return useMutation<MyTicketComment, Error, { body: string; attachments?: File[] }>({
    mutationFn: (payload) => replyToMyTicket(ticketNumber, payload),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: myTicketKeys.detail(ticketNumber) });
      void queryClient.invalidateQueries({ queryKey: myTicketKeys.all });
    },
  });
}
