import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ErrorState, Heading, LoadingState, Text } from '@shared/components';
import { useToastStore } from '@/store';
import { eventService } from '../services/event-service';
import { EventSubnav } from '../components/event-subnav';
import {
  useExternalImport,
  useExternalImports,
  useExternalTicketActions,
  useImportRow,
  useImportRows,
  useImportSponsors,
  useReviewQueue,
} from '../hooks/use-external-tickets';
import { UploadPanel } from '../components/external-tickets/upload-panel';
import { SponsorTable } from '../components/external-tickets/sponsor-table';
import { TicketRowsTable } from '../components/external-tickets/ticket-rows-table';
import { MapReviewModal } from '../components/external-tickets/map-review-modal';
import { RowDetailModal } from '../components/external-tickets/row-detail-modal';
import { ApplyPanel } from '../components/external-tickets/apply-panel';
import { ReviewQueue } from '../components/external-tickets/review-queue';
import { errorText } from '../components/external-tickets/labels';
import type { BigEvent } from '../types/event';
import type { AccountMap, DecidePayload, RowFilters, SponsorFilters } from '../types/external-tickets';

type Step = 'upload' | 'sponsors' | 'holders' | 'apply' | 'review';

const STEPS: Array<{ key: Step; label: string }> = [
  { key: 'upload', label: '1. Upload export' },
  { key: 'sponsors', label: '2. Review sponsors' },
  { key: 'holders', label: '3. Review ticket holders' },
  { key: 'apply', label: '4. Apply update' },
  { key: 'review', label: '5. Conflicts & review' },
];

/**
 * External Tickets — import BSCPro exports into this event's existing WB
 * tickets and reconcile later exports. Access is the event's Purchases access;
 * the backend enforces it on every request.
 */
export default function EventExternalTicketsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const id = Number(eventId);
  const addToast = useToastStore((state) => state.addToast);
  const [event, setEvent] = useState<BigEvent | null>(null);
  const [step, setStep] = useState<Step>('upload');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sponsorFilters, setSponsorFilters] = useState<SponsorFilters>({ sort: 'total', direction: 'desc', page: 1 });
  const [rowFilters, setRowFilters] = useState<RowFilters>({ page: 1 });
  const [reviewKind, setReviewKind] = useState('');
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewMap, setReviewMap] = useState<AccountMap | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [openRowId, setOpenRowId] = useState<number | null>(null);
  const [busyMapId, setBusyMapId] = useState<number | null>(null);
  // Server-confirmed map states, patched in place so rows do not jump or vanish.
  const [overrides, setOverrides] = useState<Record<number, AccountMap>>({});

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    void eventService.get(id).then(setEvent).catch(() => setEvent(null));
  }, [id]);

  const imports = useExternalImports(id);
  const importList = useMemo(() => imports.data?.rows ?? [], [imports.data]);
  useEffect(() => {
    if (selectedId !== null || !importList.length) return;
    const working = importList.find((imp) => imp.state !== 'superseded' && imp.state !== 'historical') ?? importList[0];
    setSelectedId(working.id);
  }, [importList, selectedId]);

  const current = useExternalImport(id, selectedId);
  const imp = current.data ?? null;
  const ready = imp !== null && (imp.state === 'preview_ready' || imp.state === 'applied' || imp.state === 'applying');
  const sponsors = useImportSponsors(id, ready ? selectedId : null, sponsorFilters);
  const rows = useImportRows(id, ready ? selectedId : null, rowFilters);
  const rowDetail = useImportRow(id, selectedId, openRowId);
  const review = useReviewQueue(id, { review_state: 'open', kind: reviewKind, page: reviewPage });
  const actions = useExternalTicketActions(id);

  // Analyze automatically when a staged import is first opened on a step that needs it.
  const [analyzed, setAnalyzed] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!imp || imp.state !== 'preview_ready') return;
    const stage = step === 'sponsors' ? 'sponsors' : step === 'holders' ? 'holders' : null;
    if (!stage || analyzed[`${imp.id}:${stage}`]) return;
    setAnalyzed((prev) => ({ ...prev, [`${imp.id}:${stage}`]: true }));
    actions.analyze.mutate(
      { importId: imp.id, stage },
      { onError: (err) => addToast({ type: 'error', message: errorText(err) }) },
    );
  }, [imp, step, analyzed, actions.analyze, addToast]);

  const decide = async (map: AccountMap, payload: DecidePayload) => {
    setBusyMapId(map.id);
    try {
      const result = await actions.decide.mutateAsync({ mapId: map.id, payload });
      setOverrides((prev) => ({ ...prev, ...Object.fromEntries(result.maps.map((m) => [m.id, m])) }));
      setReviewMap(null);
      setReviewError(null);
      void sponsors.refetch();
    } catch (err) {
      const message = errorText(err);
      if (reviewMap) setReviewError(message);
      else addToast({ type: 'error', message });
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'stale_revision') {
        void rows.refetch();
        void sponsors.refetch();
      }
    } finally {
      setBusyMapId(null);
    }
  };

  const quickConfirm = (map: AccountMap) => {
    if (!map.account) return;
    void decide(map, { account_id: map.account.id, expected_revision: map.revision, quick_confirm: true, scope: 'group' });
  };

  if (!Number.isFinite(id)) return <Text variant="muted">Invalid event.</Text>;

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h1">{event?.name || 'External tickets'}</Heading>
        <Text variant="muted">Import tickets sold through BSCPro and keep them in step with later exports</Text>
      </div>
      <EventSubnav eventId={id} />

      <nav aria-label="External ticket steps" className="flex flex-wrap gap-2">
        {STEPS.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-current={step === s.key ? 'step' : undefined}
            onClick={() => setStep(s.key)}
            className={`rounded-full border px-3 py-1 text-sm ${step === s.key ? 'border-amber-400 bg-amber-50 font-semibold text-amber-800 dark:bg-white/10 dark:text-[#ffd700]' : 'border-slate-200 dark:border-white/10'}`}
          >
            {s.label}
            {s.key === 'review' && review.data?.pagination.total ? ` (${review.data.pagination.total})` : ''}
          </button>
        ))}
      </nav>

      {imports.isLoading ? (
        <LoadingState />
      ) : imports.isError ? (
        <ErrorState description={errorText(imports.error)} onRetry={() => void imports.refetch()} />
      ) : null}

      {step === 'upload' ? (
        <UploadPanel
          eventName={event?.name ?? 'this event'}
          imports={importList}
          selectedId={selectedId}
          uploading={actions.upload.isPending}
          onSelect={(importId) => {
            setSelectedId(importId);
            setOverrides({});
          }}
          onUpload={async (file, capturedAt) => {
            const result = await actions.upload.mutateAsync({ file, capturedAt });
            setSelectedId(result.id);
            setOverrides({});
            addToast({
              type: 'success',
              message: result.created === false ? 'This exact file was already uploaded — opened it.' : 'Upload accepted. Validating…',
            });
            return result;
          }}
        />
      ) : null}

      {step !== 'upload' && step !== 'review' && !imp ? <Text variant="muted">Upload an export first.</Text> : null}
      {step !== 'upload' && step !== 'review' && imp && !ready ? (
        <Text variant="muted" aria-live="polite">
          {imp.state === 'failed' ? `This upload failed validation: ${imp.safe_error.replace(/_/g, ' ')}.` : 'Validating the export…'}
        </Text>
      ) : null}

      {step === 'sponsors' && ready ? (
        <SponsorTable
          rows={sponsors.data?.rows ?? []}
          summary={sponsors.data?.summary}
          pagination={sponsors.data?.pagination}
          filters={sponsorFilters}
          loading={sponsors.isLoading || actions.analyze.isPending}
          error={sponsors.isError ? errorText(sponsors.error) : null}
          busyMapId={busyMapId}
          overrides={overrides}
          onFilters={(patch) => setSponsorFilters((prev) => ({ ...prev, page: 1, ...patch }))}
          onQuickConfirm={quickConfirm}
          onReview={setReviewMap}
          onOpenSponsor={(name) => {
            setRowFilters({ q: name, role: 'sponsor', page: 1 });
            setStep('holders');
          }}
        />
      ) : null}

      {step === 'holders' && ready ? (
        <TicketRowsTable
          rows={rows.data?.rows ?? []}
          pagination={rows.data?.pagination}
          filters={rowFilters}
          loading={rows.isLoading || actions.analyze.isPending}
          error={rows.isError ? errorText(rows.error) : null}
          busyMapId={busyMapId}
          overrides={overrides}
          onFilters={setRowFilters}
          onQuickConfirm={quickConfirm}
          onReview={setReviewMap}
          onOpen={(row) => setOpenRowId(row.id)}
        />
      ) : null}

      {step === 'apply' && imp && imp.state !== 'queued' && imp.state !== 'validating' && imp.state !== 'failed' ? (
        <ApplyPanel
          imp={imp}
          previewing={actions.preview.isPending}
          applying={actions.apply.isPending}
          onPreview={async () => {
            await actions.preview.mutateAsync(imp.id);
          }}
          onApply={async (key) => {
            await actions.apply.mutateAsync({ imp, key });
            addToast({ type: 'info', message: 'Update accepted — applying in the background.' });
          }}
          onShowRows={(filters) => {
            setRowFilters(filters);
            setStep('holders');
          }}
          onShowReview={(kind) => {
            setReviewKind(kind);
            setReviewPage(1);
            setStep('review');
          }}
        />
      ) : null}

      {step === 'review' ? (
        <ReviewQueue
          eventId={id}
          rows={review.data?.rows ?? []}
          pagination={review.data?.pagination}
          kind={reviewKind}
          loading={review.isLoading}
          error={review.isError ? errorText(review.error) : null}
          resolving={actions.resolve.isPending}
          onKind={(kind) => {
            setReviewKind(kind);
            setReviewPage(1);
          }}
          onPage={setReviewPage}
          onResolve={async (item, payload) => {
            await actions.resolve.mutateAsync({ changeId: item.id, payload });
            addToast({ type: 'success', message: 'Resolved.' });
          }}
        />
      ) : null}

      <MapReviewModal
        eventId={id}
        map={reviewMap}
        submitting={busyMapId !== null}
        error={reviewError}
        onClose={() => {
          setReviewMap(null);
          setReviewError(null);
        }}
        onSubmit={(payload) => reviewMap && void decide(reviewMap, payload)}
      />
      <RowDetailModal
        open={openRowId !== null}
        detail={rowDetail.data}
        loading={rowDetail.isLoading}
        error={rowDetail.isError ? errorText(rowDetail.error) : null}
        busyMapId={busyMapId}
        overrides={overrides}
        onClose={() => setOpenRowId(null)}
        onQuickConfirm={quickConfirm}
        onReview={setReviewMap}
      />
    </div>
  );
}
