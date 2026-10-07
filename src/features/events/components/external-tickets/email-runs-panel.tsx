import { useState } from 'react';
import { Badge, Button, Card, CardContent, ErrorState, Input, LoadingState, Modal, Select, Text } from '@shared/components';
import { useEmailDeliveries } from '../../hooks/use-ticket-emails';
import type { EmailOutcome, EmailRun, Pagination } from '../../types/external-tickets';
import { COUNT_ORDER, OUTCOME, RUN_KIND, RUN_STATUS, formatWhen } from './email-labels';
import { Pager } from './shared';

interface EmailRunsPanelProps {
  eventId: number;
  runs: EmailRun[];
  pagination: Pagination | undefined;
  loading: boolean;
  error: string | null;
  canSend: boolean;
  busy: boolean;
  onPage: (page: number) => void;
  onStop: (run: EmailRun) => void;
  onRetry: (run: EmailRun) => void;
}

/** Counters for a run; delivered/opened/bounced arrive from SendGrid after sending. */
function RunCounts({ counts }: { counts: EmailRun['counts'] }) {
  const shown = COUNT_ORDER.filter((k) => (counts[k] ?? 0) > 0);
  if (!shown.length) return <Text variant="muted">—</Text>;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((k) => (
        <Badge key={k} variant={OUTCOME[k].variant}>
          {OUTCOME[k].label.split(' —')[0]}: {counts[k]}
        </Badge>
      ))}
    </div>
  );
}

/** Every send for the event, who confirmed it, and live tracking per email. */
export function EmailRunsPanel(props: EmailRunsPanelProps) {
  const { runs, loading, error } = props;
  const [openRun, setOpenRun] = useState<EmailRun | null>(null);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Send history &amp; tracking</h2>
        <Text variant="muted" className="text-sm">
          Delivered, opened and bounced come from SendGrid and update for a few minutes after a send.
        </Text>
      </div>
      {loading && !runs.length ? (
        <LoadingState />
      ) : error ? (
        <ErrorState description={error} />
      ) : !runs.length ? (
        <Text variant="muted">Nothing has been sent yet.</Text>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="text-left">
                  <tr>
                    <th scope="col" className="px-3 py-2">Send</th>
                    <th scope="col" className="px-3 py-2">Status</th>
                    <th scope="col" className="px-3 py-2">People</th>
                    <th scope="col" className="px-3 py-2">Confirmed</th>
                    <th scope="col" className="px-3 py-2">Tracking</th>
                    <th scope="col" className="px-3 py-2"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => {
                    const failed = (run.counts.failed ?? 0) + (run.counts.error ?? 0);
                    return (
                      <tr key={run.id} className="border-t border-slate-100 align-top dark:border-white/5">
                        <td className="px-3 py-2">
                          <div className="font-medium">{RUN_KIND[run.kind]} #{run.id}</div>
                          <div className="text-xs text-slate-500">prepared {formatWhen(run.created_at)}</div>
                        </td>
                        <td className="px-3 py-2"><Badge variant={RUN_STATUS[run.status].variant}>{RUN_STATUS[run.status].label}</Badge></td>
                        <td className="px-3 py-2">{run.recipient_count} <span className="text-xs text-slate-500">({run.ticket_count} tickets)</span></td>
                        <td className="px-3 py-2">
                          {run.confirmed_at ? (
                            <>
                              <div>{run.confirmed_by}</div>
                              <div className="text-xs text-slate-500">{formatWhen(run.confirmed_at)}</div>
                            </>
                          ) : '—'}
                          {run.cancelled_at ? <div className="text-xs text-amber-700">stopped by {run.cancelled_by}</div> : null}
                        </td>
                        <td className="px-3 py-2"><RunCounts counts={run.counts} /></td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setOpenRun(run)}>Details</Button>
                            {props.canSend && run.status === 'sending' ? (
                              <Button variant="destructive" size="sm" disabled={props.busy} onClick={() => props.onStop(run)}>Stop</Button>
                            ) : null}
                            {props.canSend && run.kind !== 'preview' && run.status !== 'sending' && failed > 0 ? (
                              <Button variant="outline" size="sm" disabled={props.busy} onClick={() => props.onRetry(run)}>
                                Retry {failed} failed
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      <Pager pagination={props.pagination} onPage={props.onPage} />
      <DeliveriesModal eventId={props.eventId} run={openRun} onClose={() => setOpenRun(null)} />
    </section>
  );
}

/** One run's emails, filterable by tracked outcome. */
function DeliveriesModal({ eventId, run, onClose }: { eventId: number; run: EmailRun | null; onClose: () => void }) {
  const [outcome, setOutcome] = useState<EmailOutcome | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const deliveries = useEmailDeliveries(eventId, run?.id ?? null, { outcome, search, page });
  const rows = deliveries.data?.rows ?? [];

  return (
    <Modal
      open={run !== null}
      onClose={() => {
        setOutcome('');
        setSearch('');
        setPage(1);
        onClose();
      }}
      dismissible
      title={run ? `${RUN_KIND[run.kind]} #${run.id}` : ''}
      subtitle={run ? `${run.subject} · ${run.recipient_count} people` : undefined}
      className="max-w-4xl"
    >
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          <Select aria-label="Outcome" value={outcome} onChange={(e) => { setOutcome(e.target.value as EmailOutcome | ''); setPage(1); }} className="max-w-[220px]">
            <option value="">Any outcome</option>
            {(Object.keys(OUTCOME) as EmailOutcome[]).map((k) => (
              <option key={k} value={k}>{OUTCOME[k].label}</option>
            ))}
          </Select>
          <Input aria-label="Search email, name or ticket" placeholder="Email, name or ticket" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
        </div>
        {deliveries.isLoading ? (
          <LoadingState />
        ) : deliveries.isError ? (
          <ErrorState description="Could not load the emails." />
        ) : !rows.length ? (
          <Text variant="muted">No emails match.</Text>
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full min-w-[720px]">
              <thead className="sticky top-0 bg-white text-left dark:bg-slate-900">
                <tr>
                  <th scope="col" className="px-2 py-1">Email</th>
                  <th scope="col" className="px-2 py-1">Tickets</th>
                  <th scope="col" className="px-2 py-1">Outcome</th>
                  <th scope="col" className="px-2 py-1">When</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="border-t border-slate-100 align-top dark:border-white/5">
                    <td className="px-2 py-1 font-mono text-xs">{d.address}</td>
                    <td className="px-2 py-1">
                      {d.tickets.map((t) => (
                        <div key={t.id}>{t.holder || '—'} <span className="font-mono text-xs text-slate-500">{t.number}</span></div>
                      ))}
                    </td>
                    <td className="px-2 py-1">
                      <Badge variant={OUTCOME[d.outcome].variant}>{OUTCOME[d.outcome].label}</Badge>
                      {d.error || d.bounce_reason ? <div className="mt-1 text-xs text-red-600">{d.error || d.bounce_reason}</div> : null}
                    </td>
                    <td className="px-2 py-1 text-xs text-slate-500">
                      {d.queued_at ? <div>queued {formatWhen(d.queued_at)}</div> : null}
                      {d.delivered_at ? <div>delivered {formatWhen(d.delivered_at)}</div> : null}
                      {d.first_opened_at ? <div>opened {formatWhen(d.first_opened_at)}</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager pagination={deliveries.data?.pagination} onPage={setPage} />
      </div>
    </Modal>
  );
}
