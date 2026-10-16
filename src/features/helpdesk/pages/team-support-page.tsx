import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowUpFromLine, CheckCircle2, ImagePlus, Info } from 'lucide-react';

import { useAuth } from '@/features/auth/hooks/use-auth';
import { useToastStore } from '@/store';

import { LocalFileThumb, TicketAttachmentsSection } from '../components/attachment-strip';
import { EscalateDialog } from '../components/escalate-dialog';
import { OverdueBanner } from '../components/overdue-banner';
import { QueueTabs, type QueueTab } from '../components/queue-tabs';
import { SupportContextPanel } from '../components/support-context-panel';
import { TicketConversation } from '../components/ticket-conversation';
import { QueueStateBadge, SlaBadge, SlaSummary, TicketStatusBadge } from '../components/ticket-badges';
import { queueStateRowClass } from '../queue-state';
import { categoryLabel, formatHelpdeskDate } from '../constants';
import { useQueueCounts } from '../hooks/use-queue-counts';
import {
  useAcknowledgeTeamTicket,
  useEscalateTeamTicket,
  useTeamComment,
  useTeamTicket,
  useTeamTickets,
  useTeamTicketStatus,
} from '../hooks/use-team-tickets';
import {
  TEAM_TICKETS_PAGE_SIZE,
  type TeamQueueCounts,
  type TeamTicketDetail,
  type TeamTicketListItem,
  type TeamTicketStatus,
  type TeamTicketView,
} from '../services/helpdesk-service';
import { IMAGE_ACCEPT, MAX_ATTACHMENTS, checkNewAttachments, imagesFromClipboard } from '../support-context/attachment-rules';

const CARD = 'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5';
const PAGER_BUTTON =
  'rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10';
const SECONDARY_BUTTON =
  'inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/25 dark:hover:bg-white/10';

const TEAM_VIEWS: TeamTicketView[] = ['needs_action', 'at_risk', 'open', 'waiting', 'escalated', 'resolved'];

const STATUS_ACTIONS: Array<{ value: TeamTicketStatus; label: string }> = [
  { value: 'in_progress', label: 'In progress' },
  { value: 'waiting_on_user', label: 'Waiting on user' },
  { value: 'resolved', label: 'Resolved' },
];

/** Narrow a `?view=` value to a known team view (default "Needs action"). */
function parseTeamView(value: string | null): TeamTicketView {
  return value && (TEAM_VIEWS as string[]).includes(value) ? (value as TeamTicketView) : 'needs_action';
}

/** Tabs with counts from the team counters. */
function buildTeamTabs(counts: TeamQueueCounts | null | undefined): Array<QueueTab<TeamTicketView>> {
  return [
    { key: 'needs_action', label: 'Needs action', count: counts?.needs_action, emphasize: true },
    { key: 'at_risk', label: 'At risk', count: counts ? counts.due_soon + counts.breached : undefined },
    { key: 'open', label: 'Open', count: counts?.open },
    { key: 'waiting', label: 'Waiting on user', count: counts?.waiting_on_user },
    { key: 'escalated', label: 'Escalated' },
    { key: 'resolved', label: 'Resolved' },
  ];
}

/**
 * Team Support (L1): tickets from the SMD's team routed to their office. Worked by
 * the SMD and their assistant (who signs in as the SMD). Views live in `?view=`,
 * the open ticket in `?ticket=` (notification links). Once a ticket is escalated
 * to central support it is read-only here.
 */
export default function TeamSupportPage() {
  const { user } = useAuth();
  const actingAs = user?.actingAs ?? null;
  const [searchParams, setSearchParams] = useSearchParams();
  const view = parseTeamView(searchParams.get('view'));
  const urlTicket = (searchParams.get('ticket') || '').trim();
  const [page, setPage] = useState(1);

  const { data: counts } = useQueueCounts();
  const listQuery = useTeamTickets(view, page);
  const tickets = listQuery.data?.results ?? [];
  const totalCount = listQuery.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / TEAM_TICKETS_PAGE_SIZE));
  // Auto-open the view's first ticket without writing it to the URL, so `?ticket=` always
  // means an explicit choice (row click or notification link) — only those are acknowledged.
  // Skipped while showing the previous view's placeholder rows.
  const firstTicketNumber = listQuery.isPlaceholderData ? null : (tickets[0]?.ticket_number ?? null);
  const selected = urlTicket || firstTicketNumber;
  const explicit = Boolean(urlTicket);

  /** Update query params in place (no history entry). */
  const updateParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next, { replace: true });
  };

  const changeView = (next: TeamTicketView) => {
    setPage(1);
    updateParams({ view: next, ticket: null });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 text-slate-900 dark:text-white">
      <div>
        <h1 className="text-xl font-bold">Team Support</h1>
        <p className="text-xs text-slate-600 dark:text-white/65">
          Problems reported by your team. Reply, set a status, or escalate to central support.
        </p>
      </div>

      {actingAs ? (
        <div className="flex items-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:border-sky-300/20 dark:bg-sky-500/10 dark:text-sky-50">
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          You&apos;re handling tickets for {actingAs.principal_name}&apos;s team.
        </div>
      ) : null}

      <OverdueBanner
        section="team"
        breached={counts?.team?.breached ?? 0}
        onShowAtRisk={view === 'at_risk' ? undefined : () => changeView('at_risk')}
      />

      <QueueTabs label="Team ticket views" tabs={buildTeamTabs(counts?.team)} active={view} onChange={changeView} />

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[380px_1fr]">
        <section className={`${CARD} flex min-h-0 flex-col`}>
          <div className="min-h-0 flex-1 overflow-auto">
            {listQuery.isLoading ? (
              <div className="p-4 text-sm text-slate-600 dark:text-white/70">Loading tickets...</div>
            ) : listQuery.isError ? (
              <div className="p-4 text-sm text-red-600 dark:text-red-300">{listQuery.error.message}</div>
            ) : tickets.length === 0 ? (
              <div className="p-4 text-sm text-slate-600 dark:text-white/70">
                {view === 'needs_action'
                  ? 'Nothing needs you right now.'
                  : view === 'at_risk'
                    ? 'No tickets are due soon or overdue.'
                    : 'No tickets in this view.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-white/10">
                {tickets.map((ticket) => (
                  <TeamTicketRow
                    key={ticket.ticket_number}
                    ticket={ticket}
                    selected={selected === ticket.ticket_number}
                    onSelect={() => updateParams({ ticket: ticket.ticket_number })}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-2 text-xs text-slate-600 dark:border-white/10 dark:text-white/70">
            <button type="button" className={PAGER_BUTTON} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={listQuery.isFetching || page <= 1}>
              Prev
            </button>
            <span>
              Page {page} of {totalPages} ({totalCount} tickets)
            </span>
            <button type="button" className={PAGER_BUTTON} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={listQuery.isFetching || page >= totalPages}>
              Next
            </button>
          </div>
        </section>

        <section className={`${CARD} min-h-0 overflow-auto p-4`}>
          <TeamTicketDetailPane ticketNumber={selected} explicit={explicit} />
        </section>
      </div>
    </div>
  );
}

/** One list row with state highlighting (bold + blue dot for new / user replied). */
function TeamTicketRow({ ticket, selected, onSelect }: { ticket: TeamTicketListItem; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      className={`w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-white/10 ${selected ? 'bg-slate-100 dark:bg-white/10' : ''} ${queueStateRowClass(ticket.queue_state)}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[#c9a227] dark:text-[#f5d66a]">{ticket.ticket_number}</span>
        <span className="flex shrink-0 items-center gap-1">
          <SlaBadge ticket={ticket} />
          <QueueStateBadge state={ticket.queue_state} />
        </span>
      </div>
      <div className="truncate text-sm">{ticket.subject || categoryLabel(ticket.category)}</div>
      <div className="mt-1 text-xs font-normal text-slate-600 dark:text-white/65">
        {ticket.name} · {formatHelpdeskDate(ticket.created_at)} · {ticket.comment_count} comment{ticket.comment_count === 1 ? '' : 's'}
      </div>
    </button>
  );
}

/** Detail pane: loads the ticket and, if explicitly chosen, acknowledges it once when it needs action. */
function TeamTicketDetailPane({ ticketNumber, explicit }: { ticketNumber: string | null; explicit: boolean }) {
  const detailQuery = useTeamTicket(ticketNumber);
  const acknowledge = useAcknowledgeTeamTicket();
  const acknowledged = useRef<Set<string>>(new Set());

  const needsAction = Boolean(detailQuery.data?.needs_action);
  const { mutate: acknowledgeTicket } = acknowledge;
  useEffect(() => {
    if (!ticketNumber || !explicit || !needsAction || acknowledged.current.has(ticketNumber)) return;
    // Once per ticket per visit, so a failing call can't loop.
    acknowledged.current.add(ticketNumber);
    acknowledgeTicket(ticketNumber);
  }, [ticketNumber, explicit, needsAction, acknowledgeTicket]);

  if (!ticketNumber) return <div className="text-sm text-slate-600 dark:text-white/70">Select a ticket to view details.</div>;
  if (detailQuery.isLoading) return <div className="text-sm text-slate-600 dark:text-white/70">Loading ticket...</div>;
  if (detailQuery.isError || !detailQuery.data) {
    return <div className="text-sm text-red-600 dark:text-red-300">{detailQuery.error?.message || 'Ticket not found.'}</div>;
  }
  return (
    <TeamTicketDetailView
      key={detailQuery.data.ticket_number}
      ticket={detailQuery.data}
      onMarkReceived={!explicit && needsAction ? () => acknowledgeTicket(ticketNumber) : undefined}
      markingReceived={acknowledge.isPending}
    />
  );
}

interface TeamTicketDetailViewProps {
  ticket: TeamTicketDetail;
  /** Set for an auto-opened ticket that needs action: shows "Mark as received". */
  onMarkReceived?: () => void;
  markingReceived?: boolean;
}

/** Ticket header, escalation banner, context, conversation, status actions and reply box. */
function TeamTicketDetailView({ ticket, onMarkReceived, markingReceived = false }: TeamTicketDetailViewProps) {
  const addToast = useToastStore((state) => state.addToast);
  const setStatus = useTeamTicketStatus(ticket.ticket_number);
  const escalate = useEscalateTeamTicket(ticket.ticket_number);
  const [escalateOpen, setEscalateOpen] = useState(false);

  // Anything that has left L1 is read-only here (older backends omit `tier`).
  const isEscalated = Boolean(ticket.tier && ticket.tier !== 'l1');
  const isClosed = ticket.status === 'closed';
  const canAct = !isEscalated && !isClosed;

  const changeStatus = (status: TeamTicketStatus) => {
    setStatus.mutate(status, {
      onSuccess: () => addToast({ type: 'success', message: 'Ticket updated.' }),
      onError: (err) => addToast({ type: 'error', message: err.message }),
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-black/20">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{ticket.ticket_number}</span>
          <QueueStateBadge state={ticket.queue_state} />
          <SlaBadge ticket={ticket} variant="detail" />
          <TicketStatusBadge status={ticket.status} />
          <span className="text-xs text-slate-600 dark:text-white/65">{categoryLabel(ticket.category)}</span>
        </div>
        <SlaSummary ticket={ticket} firstResponseAt={ticket.first_response_at} className="mt-1" />
        <div className="mt-1"><strong>From:</strong> {ticket.name}</div>
        {ticket.reported_by_name ? <div><strong>Reported by:</strong> {ticket.reported_by_name} (assistant)</div> : null}
        {ticket.subject ? <div className="mt-1 font-medium">{ticket.subject}</div> : null}
        <div className="mt-2 whitespace-pre-wrap">{ticket.description}</div>
        {ticket.page_path ? (
          <div className="mt-2 text-xs text-slate-600 dark:text-white/65">
            Reported from <span className="font-mono">{ticket.page_path}</span>
          </div>
        ) : null}
        <div className="mt-1 text-xs text-slate-600 dark:text-white/65">
          Opened {formatHelpdeskDate(ticket.created_at)} · Updated {formatHelpdeskDate(ticket.updated_at)}
        </div>
      </div>

      {onMarkReceived ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:border-sky-300/20 dark:bg-sky-500/10 dark:text-sky-50">
          <span>This ticket needs action and hasn&apos;t been marked as received yet.</span>
          <button type="button" className={SECONDARY_BUTTON} onClick={onMarkReceived} disabled={markingReceived}>
            <CheckCircle2 className="h-4 w-4" /> Mark as received
          </button>
        </div>
      ) : null}

      {isEscalated ? (
        <div role="status" className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs text-indigo-900 dark:border-indigo-300/20 dark:bg-indigo-500/10 dark:text-indigo-50">
          <strong>
            Escalated to central support{ticket.escalated_at ? ` on ${formatHelpdeskDate(ticket.escalated_at)}` : ''}.
          </strong>{' '}
          Central support is handling it now; this view is read-only.
          {ticket.escalation_reason ? <div className="mt-1 whitespace-pre-wrap">Reason: {ticket.escalation_reason}</div> : null}
        </div>
      ) : null}

      <TicketAttachmentsSection attachments={ticket.attachments} comments={ticket.comments} />

      <SupportContextPanel context={ticket.context} />

      {canAct ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-white/70">Set status:</span>
          {STATUS_ACTIONS.map((action) => (
            <button
              key={action.value}
              type="button"
              className={`${SECONDARY_BUTTON} ${ticket.status === action.value ? 'border-[#c9a227] bg-amber-50 font-semibold dark:border-[#f5d66a]/60 dark:bg-[#f5d66a]/10' : ''}`}
              aria-pressed={ticket.status === action.value}
              disabled={setStatus.isPending || ticket.status === action.value}
              onClick={() => changeStatus(action.value)}
            >
              {action.label}
            </button>
          ))}
          <button type="button" className={`${SECONDARY_BUTTON} ml-auto`} onClick={() => setEscalateOpen(true)} disabled={escalate.isPending}>
            <ArrowUpFromLine className="h-4 w-4" /> Escalate to central support
          </button>
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-black/20">
        <h3 className="mb-2 text-sm font-semibold">Conversation</h3>
        <TicketConversation comments={ticket.comments} />
      </div>

      {canAct ? <TeamReplyBox ticketNumber={ticket.ticket_number} /> : null}
      {isClosed && !isEscalated ? (
        <div className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-white/75">
          This ticket is closed.
        </div>
      ) : null}

      <EscalateDialog
        open={escalateOpen}
        onOpenChange={setEscalateOpen}
        title="Escalate to central support"
        description="Central support (L2) takes the ticket over and your team can no longer reply to it."
        confirmLabel="Escalate"
        onConfirm={async (reason) => {
          await escalate.mutateAsync(reason);
          addToast({ type: 'success', message: 'Escalated to central support.' });
        }}
      />
    </div>
  );
}

/** Reply / internal-note form with optional images (picker or paste). */
function TeamReplyBox({ ticketNumber }: { ticketNumber: string }) {
  const comment = useTeamComment(ticketNumber);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  /** Add images subject to the shared upload rules. */
  const addFiles = (incoming: File[]) => {
    if (incoming.length === 0) return;
    const { accepted, errors } = checkNewAttachments(files.length, incoming);
    setFileErrors(errors);
    if (accepted.length) setFiles((current) => [...current, ...accepted]);
  };

  const handlePaste = (event: ClipboardEvent<HTMLFormElement>) => {
    const pasted = imagesFromClipboard(event.clipboardData);
    if (pasted.length === 0) return;
    event.preventDefault();
    addFiles(pasted);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim() || comment.isPending) return;
    setError(null);
    comment.mutate(
      { body: body.trim(), is_internal: isInternal, attachments: files },
      {
        onSuccess: () => {
          setBody('');
          setFiles([]);
          setFileErrors([]);
          setIsInternal(false);
        },
        onError: (err) => setError(err.message),
      }
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      onPaste={handlePaste}
      className={`rounded-lg border p-3 ${
        isInternal
          ? 'border-dashed border-amber-400 bg-amber-50/70 dark:border-amber-300/40 dark:bg-amber-500/10'
          : 'border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/20'
      }`}
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        required
        placeholder={isInternal ? 'Internal note — only your office and support staff see this' : 'Reply to the requester (you can paste images)'}
        disabled={comment.isPending}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 dark:border-white/20 dark:bg-black/30 dark:text-white dark:placeholder:text-white/50"
      />
      {files.length ? (
        <div className="mt-2 flex flex-wrap gap-3">
          {files.map((file, index) => (
            <LocalFileThumb key={`${file.name}-${index}`} file={file} onRemove={() => setFiles((current) => current.filter((_, i) => i !== index))} />
          ))}
        </div>
      ) : null}
      {fileErrors.map((message) => (
        <p key={message} className="mt-1 text-xs text-red-600 dark:text-red-300">{message}</p>
      ))}
      {error ? <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-300">{error}</p> : null}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-white/80">
            <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} disabled={comment.isPending} />
            Internal note
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={files.length >= MAX_ATTACHMENTS || comment.isPending}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
          >
            <ImagePlus className="h-3.5 w-3.5" /> Add images ({files.length}/{MAX_ATTACHMENTS})
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []));
              e.target.value = '';
            }}
          />
        </div>
        <button
          type="submit"
          disabled={comment.isPending || !body.trim()}
          className="rounded-lg bg-[#f5d66a] px-3 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {comment.isPending ? 'Sending...' : isInternal ? 'Add note' : 'Send reply'}
        </button>
      </div>
    </form>
  );
}
