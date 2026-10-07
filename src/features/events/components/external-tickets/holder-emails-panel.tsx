import { useState } from 'react';
import { Badge, Button, Card, CardContent, Checkbox, ErrorState, Input, LoadingState, Select, Text } from '@shared/components';
import { useToastStore } from '@/store';
import { useEmailPreview, useEmailRecipients, useEmailRuns, useTicketEmailActions } from '../../hooks/use-ticket-emails';
import type { EmailRecipientFilters, EmailRecipientRow, EmailRun, EmailTargetStatus } from '../../types/external-tickets';
import { OUTCOME, REASON_LABEL, RUN_KIND, SOURCE_LABEL, TARGET_STATUS, formatWhen } from './email-labels';
import { EmailPreviewModal } from './email-preview-modal';
import { EmailRunsPanel } from './email-runs-panel';
import { errorText } from './labels';
import { SendConfirmModal } from './send-confirm-modal';
import { Pager } from './shared';

/**
 * Step 6 — email imported-ticket holders the branded WB ticket (QR included).
 *
 * Safe by construction: previews send nothing (or only to you); a test reaches
 * at most a handful of hand-picked people; "Send to all" stays locked until a
 * test with the current email has gone out, and every send needs the recipient
 * count typed back. The backend enforces all of it again.
 */
export function HolderEmailsPanel({ eventId }: { eventId: number }) {
  const addToast = useToastStore((state) => state.addToast);
  const [filters, setFilters] = useState<EmailRecipientFilters>({ status: '', page: 1 });
  const [search, setSearch] = useState('');
  // ticket id → lower-cased address, kept across pages so the people count is right.
  const [selected, setSelected] = useState<Map<number, string>>(new Map());
  const [previewTicket, setPreviewTicket] = useState<number | null>(null);
  const [draft, setDraft] = useState<EmailRun | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [runsPage, setRunsPage] = useState(1);

  const recipients = useEmailRecipients(eventId, filters);
  const runs = useEmailRuns(eventId, runsPage);
  const preview = useEmailPreview(eventId, previewTicket);
  const actions = useTicketEmailActions(eventId);

  const data = recipients.data;
  const summary = data?.summary;
  const canSend = data?.can_send ?? false;
  const maxTest = data?.test_max_recipients ?? 10;
  const selectedPeople = new Set(selected.values()).size;
  const busy = actions.draft.isPending || actions.confirm.isPending || actions.cancel.isPending;

  const toggle = (row: EmailRecipientRow) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(row.ticket)) next.delete(row.ticket);
      else next.set(row.ticket, row.address.toLowerCase());
      return next;
    });

  const prepare = async (payload: { kind: 'test' | 'bulk' | 'retry'; ticket_ids?: number[]; retry_of?: number }) => {
    try {
      setConfirmError(null);
      setDraft(await actions.draft.mutateAsync(payload));
    } catch (err) {
      addToast({ type: 'error', message: errorText(err) });
    }
  };

  const confirm = async (count: number) => {
    if (!draft) return;
    try {
      const run = await actions.confirm.mutateAsync({ runId: draft.id, count });
      addToast({ type: 'success', message: `${RUN_KIND[run.kind]} started — emailing ${run.recipient_count} people.` });
      setDraft(null);
      if (run.kind === 'test') setSelected(new Map());
    } catch (err) {
      setConfirmError(errorText(err));
    }
  };

  const discard = () => {
    if (draft) actions.cancel.mutate(draft.id);
    setDraft(null);
    setConfirmError(null);
  };

  const bulkBlocker = !canSend
    ? null
    : !data?.test_done
      ? 'Send a test to a few people first. "Send to all" unlocks once a test with the current email has gone out.'
      : !summary?.pending_recipients
        ? 'Everyone eligible has already been emailed.'
        : null;

  return (
    <div className="space-y-6">
      {!canSend && data ? (
        <p role="note" className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-white/5">
          You can preview these emails. Sending needs the <span className="font-mono">event_ticket_emails:send</span> permission —
          an admin grants it per person in the access console.
        </p>
      ) : null}

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="p-4">
            <Text variant="muted" className="text-xs uppercase">Ready to email</Text>
            <p className="text-2xl font-semibold">{summary.ready_recipients}</p>
            <Text variant="muted" className="text-xs">people · {summary.ready} tickets with a named holder and email</Text>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <Text variant="muted" className="text-xs uppercase">Not emailed yet</Text>
            <p className="text-2xl font-semibold">{summary.pending_recipients}</p>
            <Text variant="muted" className="text-xs">people · {summary.pending_tickets} tickets</Text>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <Text variant="muted" className="text-xs uppercase">Will not be emailed</Text>
            <p className="text-2xl font-semibold">{summary.unnamed + summary.missing + summary.review}</p>
            <Text variant="muted" className="text-xs">
              {summary.unnamed} no holder name · {summary.missing} no email · {summary.review} need review
            </Text>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <Text variant="muted" className="text-xs uppercase">Test send</Text>
            <p className="text-2xl font-semibold">{data?.test_done ? 'Done' : 'Not yet'}</p>
            <Text variant="muted" className="text-xs">for the current email design</Text>
          </CardContent></Card>
        </div>
      ) : null}

      {canSend ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-white/10">
          <Button
            disabled={busy || selectedPeople === 0 || selectedPeople > maxTest}
            onClick={() => void prepare({ kind: 'test', ticket_ids: [...selected.keys()] })}
          >
            Test send to selected ({selectedPeople} {selectedPeople === 1 ? 'person' : 'people'})
          </Button>
          {selected.size ? (
            <Button variant="outline" size="sm" onClick={() => setSelected(new Map())}>Clear selection</Button>
          ) : null}
          <Text variant="muted" className="text-sm">
            {selectedPeople > maxTest ? `A test can reach at most ${maxTest} people.` : `Tick up to ${maxTest} people below.`}
          </Text>
          <div className="ml-auto flex flex-col items-end gap-1">
            <Button
              variant="destructive"
              disabled={busy || bulkBlocker !== null}
              onClick={() => void prepare({ kind: 'bulk' })}
            >
              Send to all not yet emailed ({summary?.pending_recipients ?? 0} people)
            </Button>
            {bulkBlocker ? <Text variant="muted" className="max-w-sm text-right text-xs">{bulkBlocker}</Text> : null}
          </div>
        </div>
      ) : null}

      <section className="space-y-3">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setFilters({ ...filters, search, page: 1 });
          }}
        >
          <Input aria-label="Search name, email or ticket" placeholder="Name, email, ticket or confirmation" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Select
            aria-label="Email status"
            value={filters.status ?? ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as EmailTargetStatus | '', page: 1 })}
            className="max-w-[200px]"
          >
            <option value="">All tickets</option>
            {(Object.keys(TARGET_STATUS) as EmailTargetStatus[]).map((k) => (
              <option key={k} value={k}>{TARGET_STATUS[k].label}</option>
            ))}
          </Select>
          <Button type="submit" variant="outline">Search</Button>
        </form>

        {recipients.isLoading && !data ? (
          <LoadingState />
        ) : recipients.isError ? (
          <ErrorState description={errorText(recipients.error)} onRetry={() => void recipients.refetch()} />
        ) : !data?.rows.length ? (
          <Text variant="muted">No imported tickets match.</Text>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="max-h-[70vh] overflow-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead className="sticky top-0 z-10 bg-white text-left dark:bg-slate-900">
                    <tr>
                      <th scope="col" className="w-10 px-3 py-2"><span className="sr-only">Select for test</span></th>
                      <th scope="col" className="px-3 py-2">Holder</th>
                      <th scope="col" className="px-3 py-2">Ticket</th>
                      <th scope="col" className="px-3 py-2">Sends to</th>
                      <th scope="col" className="px-3 py-2">Status</th>
                      <th scope="col" className="px-3 py-2">Last email</th>
                      <th scope="col" className="px-3 py-2"><span className="sr-only">Preview</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <tr key={row.ticket} className="border-t border-slate-100 align-top dark:border-white/5">
                        <td className="px-3 py-2">
                          {canSend && row.status === 'ready' ? (
                            <Checkbox
                              aria-label={`Select ${row.holder} for a test send`}
                              checked={selected.has(row.ticket)}
                              onChange={() => toggle(row)}
                            />
                          ) : null}
                        </td>
                        <td className="px-3 py-2">{row.holder || <span className="text-slate-500">—</span>}</td>
                        <td className="px-3 py-2">
                          <div className="font-mono">{row.ticket_number}</div>
                          <div className="font-mono text-xs text-slate-500">{row.confirmation}</div>
                        </td>
                        <td className="px-3 py-2">
                          {row.address ? (
                            <>
                              <div className="font-mono text-xs">{row.address}</div>
                              <div className="text-xs text-slate-500">{SOURCE_LABEL[row.address_source] ?? row.address_source}</div>
                            </>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={TARGET_STATUS[row.status].variant}>{TARGET_STATUS[row.status].label}</Badge>
                          {row.reasons.map((r) => (
                            <div key={r} className="mt-1 max-w-[260px] text-xs text-slate-500">{REASON_LABEL[r] ?? r}</div>
                          ))}
                        </td>
                        <td className="px-3 py-2">
                          {row.last_email ? (
                            <>
                              <Badge variant={OUTCOME[row.last_email.outcome].variant}>{OUTCOME[row.last_email.outcome].label}</Badge>
                              <div className="mt-1 text-xs text-slate-500">
                                {RUN_KIND[row.last_email.run_kind]} · {formatWhen(row.last_email.at)}
                              </div>
                            </>
                          ) : <span className="text-slate-500">Never</span>}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {row.address ? (
                            <Button variant="outline" size="sm" onClick={() => setPreviewTicket(row.ticket)}>Preview</Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
        <Pager pagination={data?.pagination} onPage={(page) => setFilters({ ...filters, page })} />
      </section>

      <EmailRunsPanel
        eventId={eventId}
        runs={runs.data?.rows ?? []}
        pagination={runs.data?.pagination}
        loading={runs.isLoading}
        error={runs.isError ? errorText(runs.error) : null}
        canSend={canSend}
        busy={busy}
        onPage={setRunsPage}
        onStop={(run) => {
          actions.cancel.mutate(run.id, {
            onSuccess: () => addToast({ type: 'info', message: 'Stopped. Emails not yet queued will not be sent.' }),
            onError: (err) => addToast({ type: 'error', message: errorText(err) }),
          });
        }}
        onRetry={(run) => void prepare({ kind: 'retry', retry_of: run.id })}
      />

      <EmailPreviewModal
        open={previewTicket !== null}
        preview={preview.data}
        loading={preview.isLoading}
        error={preview.isError ? errorText(preview.error) : null}
        sendingToMe={actions.previewToMe.isPending}
        onSendToMe={() => {
          if (previewTicket === null) return;
          actions.previewToMe.mutate(previewTicket, {
            onSuccess: () => addToast({ type: 'success', message: 'Preview sent to your own email address.' }),
            onError: (err) => addToast({ type: 'error', message: errorText(err) }),
          });
        }}
        onClose={() => setPreviewTicket(null)}
      />
      <SendConfirmModal draft={draft} sending={actions.confirm.isPending} error={confirmError} onConfirm={(n) => void confirm(n)} onDiscard={discard} />
    </div>
  );
}
