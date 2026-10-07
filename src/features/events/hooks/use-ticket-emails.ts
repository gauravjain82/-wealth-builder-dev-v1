import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { externalTicketService } from '../services/external-ticket-service';
import type { EmailRecipientFilters } from '../types/external-tickets';

const keys = {
  all: (eventId: number) => ['ticket-emails', eventId] as const,
  recipients: (eventId: number, filters: EmailRecipientFilters) => ['ticket-emails', eventId, 'recipients', filters] as const,
  runs: (eventId: number, page: number) => ['ticket-emails', eventId, 'runs', page] as const,
  run: (eventId: number, runId: number) => ['ticket-emails', eventId, 'run', runId] as const,
  deliveries: (eventId: number, runId: number, params: object) => ['ticket-emails', eventId, 'deliveries', runId, params] as const,
  preview: (eventId: number, ticketId: number) => ['ticket-emails', eventId, 'preview', ticketId] as const,
};

/** Every imported ticket, where its email would go and what it was last sent. */
export function useEmailRecipients(eventId: number, filters: EmailRecipientFilters) {
  return useQuery({
    queryKey: keys.recipients(eventId, filters),
    queryFn: ({ signal }) => externalTicketService.listEmailRecipients(eventId, filters, signal),
    placeholderData: keepPreviousData,
  });
}

/**
 * Send history. Polled every 5 s while a run is sending, and for 10 minutes
 * after one finished, so delivered/opened counts arrive from SendGrid live.
 */
export function useEmailRuns(eventId: number, page: number) {
  return useQuery({
    queryKey: keys.runs(eventId, page),
    queryFn: ({ signal }) => externalTicketService.listEmailRuns(eventId, page, signal),
    placeholderData: keepPreviousData,
    refetchInterval: (q) => {
      const rows = q.state.data?.rows ?? [];
      const recent = Date.now() - 10 * 60 * 1000;
      const live = rows.some(
        (r) => r.status === 'sending' || (r.finished_at !== null && new Date(r.finished_at).getTime() > recent),
      );
      return live ? 5000 : false;
    },
  });
}

/** One run's emails with their tracked outcome. */
export function useEmailDeliveries(
  eventId: number,
  runId: number | null,
  params: { outcome?: string; search?: string; page?: number },
) {
  return useQuery({
    queryKey: keys.deliveries(eventId, runId ?? 0, params),
    queryFn: ({ signal }) => externalTicketService.listEmailDeliveries(eventId, runId as number, params, signal),
    enabled: runId !== null,
    placeholderData: keepPreviousData,
    refetchInterval: 10000,
  });
}

/** The exact email a ticket's holder would get, rendered for the browser. Sends nothing. */
export function useEmailPreview(eventId: number, ticketId: number | null) {
  return useQuery({
    queryKey: keys.preview(eventId, ticketId ?? 0),
    queryFn: ({ signal }) => externalTicketService.previewEmail(eventId, ticketId as number, signal),
    enabled: ticketId !== null,
  });
}

/** Draft → confirm → (stop). Each refreshes the email screens from the server. */
export function useTicketEmailActions(eventId: number) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: keys.all(eventId) });

  const previewToMe = useMutation({
    mutationFn: (ticketId: number) => externalTicketService.previewEmailToMe(eventId, ticketId),
    onSuccess: refresh,
  });
  const draft = useMutation({
    mutationFn: (payload: { kind: 'test' | 'bulk' | 'retry'; ticket_ids?: number[]; retry_of?: number }) =>
      externalTicketService.draftEmailRun(eventId, payload),
  });
  const confirm = useMutation({
    mutationFn: ({ runId, count }: { runId: number; count: number }) =>
      externalTicketService.confirmEmailRun(eventId, runId, count),
    onSuccess: refresh,
  });
  const cancel = useMutation({
    mutationFn: (runId: number) => externalTicketService.cancelEmailRun(eventId, runId),
    onSuccess: refresh,
  });
  return { previewToMe, draft, confirm, cancel, refresh };
}
