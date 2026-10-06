import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { externalTicketService } from '../services/external-ticket-service';
import type { DecidePayload, ExternalImport, ResolvePayload, RowFilters, SponsorFilters } from '../types/external-tickets';

/** States in which the backend is still working; the import is polled until it settles. */
const WORKING = new Set(['queued', 'validating', 'applying']);

const keys = {
  all: (eventId: number) => ['external-tickets', eventId] as const,
  imports: (eventId: number) => ['external-tickets', eventId, 'imports'] as const,
  import: (eventId: number, importId: number) => ['external-tickets', eventId, 'import', importId] as const,
  rows: (eventId: number, importId: number, filters: RowFilters) =>
    ['external-tickets', eventId, 'rows', importId, filters] as const,
  row: (eventId: number, importId: number, rowId: number) =>
    ['external-tickets', eventId, 'row', importId, rowId] as const,
  sponsors: (eventId: number, importId: number, filters: SponsorFilters) =>
    ['external-tickets', eventId, 'sponsors', importId, filters] as const,
  changes: (eventId: number, params: object) => ['external-tickets', eventId, 'changes', params] as const,
};

/** Snapshot history for the event. */
export function useExternalImports(eventId: number) {
  return useQuery({
    queryKey: keys.imports(eventId),
    queryFn: ({ signal }) => externalTicketService.listImports(eventId, signal),
  });
}

/**
 * One import, polled every 2 s while a job runs — progress survives a page
 * close because state lives on the server, not in this hook.
 */
export function useExternalImport(eventId: number, importId: number | null) {
  return useQuery({
    queryKey: keys.import(eventId, importId ?? 0),
    queryFn: ({ signal }) => externalTicketService.getImport(eventId, importId as number, signal),
    enabled: importId !== null,
    refetchInterval: (q) => (q.state.data && WORKING.has(q.state.data.state) ? 2000 : false),
  });
}

/** Paginated ticket rows; previous page stays visible while the next loads. */
export function useImportRows(eventId: number, importId: number | null, filters: RowFilters) {
  return useQuery({
    queryKey: keys.rows(eventId, importId ?? 0, filters),
    queryFn: ({ signal }) => externalTicketService.listRows(eventId, importId as number, filters, signal),
    enabled: importId !== null,
    placeholderData: keepPreviousData,
  });
}

/** Row detail — fetched only when a row is opened. */
export function useImportRow(eventId: number, importId: number | null, rowId: number | null) {
  return useQuery({
    queryKey: keys.row(eventId, importId ?? 0, rowId ?? 0),
    queryFn: ({ signal }) => externalTicketService.getRow(eventId, importId as number, rowId as number, signal),
    enabled: importId !== null && rowId !== null,
  });
}

/** Sponsor rankings + metric cards. */
export function useImportSponsors(eventId: number, importId: number | null, filters: SponsorFilters) {
  return useQuery({
    queryKey: keys.sponsors(eventId, importId ?? 0, filters),
    queryFn: ({ signal }) => externalTicketService.listSponsors(eventId, importId as number, filters, signal),
    enabled: importId !== null,
    placeholderData: keepPreviousData,
  });
}

/** Review queue (open by default). */
export function useReviewQueue(eventId: number, params: { review_state?: string; kind?: string; page?: number }) {
  return useQuery({
    queryKey: keys.changes(eventId, params),
    queryFn: ({ signal }) => externalTicketService.listChanges(eventId, params, signal),
    placeholderData: keepPreviousData,
  });
}

/** Mutations. Each refreshes the affected server state rather than guessing it locally. */
export function useExternalTicketActions(eventId: number) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: keys.all(eventId) });

  const upload = useMutation({
    mutationFn: ({ file, capturedAt }: { file: File; capturedAt: string }) =>
      externalTicketService.upload(eventId, file, capturedAt),
    onSuccess: refresh,
  });
  const analyze = useMutation({
    mutationFn: ({ importId, stage }: { importId: number; stage: 'sponsors' | 'holders' }) =>
      externalTicketService.analyze(eventId, importId, stage),
    onSuccess: refresh,
  });
  const preview = useMutation({
    mutationFn: (importId: number) => externalTicketService.preview(eventId, importId),
    onSuccess: refresh,
  });
  const apply = useMutation({
    mutationFn: ({ imp, key }: { imp: ExternalImport; key: string }) => externalTicketService.apply(eventId, imp, key),
    onSuccess: refresh,
  });
  // Deliberately does NOT invalidate the row list: a confirmed row must stay in
  // place (outlined → solid) while the operator keeps sifting. Callers patch it.
  const decide = useMutation({
    mutationFn: ({ mapId, payload }: { mapId: number; payload: DecidePayload }) =>
      externalTicketService.decide(eventId, mapId, payload),
  });
  const resolve = useMutation({
    mutationFn: ({ changeId, payload }: { changeId: number; payload: ResolvePayload }) =>
      externalTicketService.resolve(eventId, changeId, payload),
    onSuccess: refresh,
  });
  return { upload, analyze, preview, apply, decide, resolve, refresh };
}
