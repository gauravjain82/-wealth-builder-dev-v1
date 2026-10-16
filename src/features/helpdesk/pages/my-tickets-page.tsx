import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ImagePlus, Plus } from 'lucide-react';

import { AttachmentStrip, LocalFileThumb } from '../components/attachment-strip';
import { ReportProblemLauncher } from '../components/report-problem-dialog';
import { TicketStatusBadge } from '../components/ticket-badges';
import { categoryLabel, formatHelpdeskDate } from '../constants';
import { useMyTicket, useMyTickets, useReplyToMyTicket } from '../hooks/use-my-tickets';
import { HelpdeskApiError, MY_TICKETS_PAGE_SIZE, type MyTicketDetail } from '../services/helpdesk-service';
import { IMAGE_ACCEPT, MAX_ATTACHMENTS, checkNewAttachments, imagesFromClipboard } from '../support-context/attachment-rules';

const CARD = 'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5';
const PAGER_BUTTON =
  'rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10';

/**
 * Signed-in user's own helpdesk tickets: paginated list, a detail pane with the
 * public conversation and a reply box, and "New ticket" (the Report a problem
 * dialog). `?ticket=HD-...` (used by notification links) opens that ticket.
 */
export default function MyTicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTicket = (searchParams.get('ticket') || '').trim();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(urlTicket || null);

  const listQuery = useMyTickets(page);
  const tickets = listQuery.data?.results ?? [];
  const totalCount = listQuery.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / MY_TICKETS_PAGE_SIZE));

  // A notification link arriving while already on this page.
  useEffect(() => {
    if (urlTicket) setSelected(urlTicket);
  }, [urlTicket]);

  // Nothing chosen yet: open the newest ticket on the page.
  const firstTicketNumber = tickets[0]?.ticket_number ?? null;
  useEffect(() => {
    if (!selected && firstTicketNumber) setSelected(firstTicketNumber);
  }, [selected, firstTicketNumber]);

  /** Select a ticket and mirror it in the URL so the view can be shared/reloaded. */
  const selectTicket = (ticketNumber: string) => {
    setSelected(ticketNumber);
    const next = new URLSearchParams(searchParams);
    next.set('ticket', ticketNumber);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 text-slate-900 dark:text-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">My tickets</h1>
          <p className="text-xs text-slate-600 dark:text-white/65">
            Problems you have reported. Use &quot;Report a problem&quot; in the header from the page where it happens.
          </p>
        </div>
        <ReportProblemLauncher captureOnOpen={false}>
          {({ start, busy }) => (
            <button
              type="button"
              onClick={start}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-lg bg-[#f5d66a] px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
            >
              <Plus className="h-4 w-4" /> New ticket
            </button>
          )}
        </ReportProblemLauncher>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[360px_1fr]">
        <section className={`${CARD} flex min-h-0 flex-col`}>
          <div className="min-h-0 flex-1 overflow-auto">
            {listQuery.isLoading ? (
              <div className="p-4 text-sm text-slate-600 dark:text-white/70">Loading tickets...</div>
            ) : listQuery.isError ? (
              <div className="p-4 text-sm text-red-600 dark:text-red-300">{listQuery.error.message}</div>
            ) : tickets.length === 0 ? (
              <div className="p-4 text-sm text-slate-600 dark:text-white/70">You have not reported any problems yet.</div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-white/10">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.ticket_number}
                    type="button"
                    onClick={() => selectTicket(ticket.ticket_number)}
                    className={`w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-white/10 ${selected === ticket.ticket_number ? 'bg-slate-100 dark:bg-white/10' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#c9a227] dark:text-[#f5d66a]">{ticket.ticket_number}</span>
                      <TicketStatusBadge status={ticket.status} audience="requester" />
                    </div>
                    <div className="truncate text-sm">{ticket.subject || categoryLabel(ticket.category)}</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-white/65">
                      {ticket.last_reply_at
                        ? `Last reply ${formatHelpdeskDate(ticket.last_reply_at)} · ${ticket.reply_count} repl${ticket.reply_count === 1 ? 'y' : 'ies'}`
                        : `Opened ${formatHelpdeskDate(ticket.created_at)} · no replies yet`}
                    </div>
                  </button>
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
          <TicketDetailPane ticketNumber={selected} />
        </section>
      </div>
    </div>
  );
}

/** Detail pane for one ticket; handles its own loading/error states. */
function TicketDetailPane({ ticketNumber }: { ticketNumber: string | null }) {
  const detailQuery = useMyTicket(ticketNumber);

  if (!ticketNumber) return <div className="text-sm text-slate-600 dark:text-white/70">Select a ticket to view details.</div>;
  if (detailQuery.isLoading) return <div className="text-sm text-slate-600 dark:text-white/70">Loading ticket...</div>;
  if (detailQuery.isError || !detailQuery.data) {
    return <div className="text-sm text-red-600 dark:text-red-300">{detailQuery.error?.message || 'Ticket not found.'}</div>;
  }
  return <TicketDetail ticket={detailQuery.data} />;
}

/** Ticket body, attachments, public conversation and reply box. */
function TicketDetail({ ticket }: { ticket: MyTicketDetail }) {
  const isClosed = ticket.status === 'closed';
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-black/20">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{ticket.ticket_number}</span>
          <TicketStatusBadge status={ticket.status} audience="requester" />
          <span className="text-xs text-slate-600 dark:text-white/65">{categoryLabel(ticket.category)}</span>
        </div>
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
        {ticket.attachments?.length ? (
          <div className="mt-3">
            <AttachmentStrip attachments={ticket.attachments} />
          </div>
        ) : null}
      </div>

      {ticket.status === 'waiting_on_user' ? (
        <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-300/20 dark:bg-amber-500/10 dark:text-amber-50">
          <strong>Waiting on you.</strong> Support needs more information — reply below to continue.
        </div>
      ) : null}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Conversation</h3>
        {ticket.comments.length === 0 ? (
          <p className="text-xs text-slate-600 dark:text-white/65">No replies yet. Our team will reply here.</p>
        ) : (
          ticket.comments.map((comment) => (
            <div
              key={comment.id}
              className={`rounded-md border p-2 text-sm ${
                comment.is_staff_reply
                  ? 'border-[#f5d66a]/60 bg-amber-50 dark:border-[#f5d66a]/30 dark:bg-[#f5d66a]/10'
                  : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/5'
              }`}
            >
              <div className="mb-1 text-xs text-slate-600 dark:text-white/70">
                <strong>{comment.is_staff_reply ? `${comment.author_name || 'Support Team'} (Support)` : comment.author_name || 'You'}</strong>
                {' · '}
                {formatHelpdeskDate(comment.created_at)}
              </div>
              <div className="whitespace-pre-wrap">{comment.body}</div>
              {comment.attachments?.length ? (
                <div className="mt-2">
                  <AttachmentStrip attachments={comment.attachments} compact />
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      {isClosed ? (
        <div className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-white/75">
          This ticket is closed — open a new one if you still need help.
        </div>
      ) : (
        <ReplyBox key={ticket.ticket_number} ticketNumber={ticket.ticket_number} />
      )}
    </div>
  );
}

/** Reply form with optional image attachments (picker or paste). */
function ReplyBox({ ticketNumber }: { ticketNumber: string }) {
  const reply = useReplyToMyTicket(ticketNumber);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState('');
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
    if (!body.trim() || reply.isPending) return;
    setError(null);
    reply.mutate(
      { body: body.trim(), attachments: files },
      {
        onSuccess: () => {
          setBody('');
          setFiles([]);
          setFileErrors([]);
        },
        onError: (err) => {
          if (err instanceof HelpdeskApiError && err.code === 'ticket_closed') {
            setError('This ticket is closed — open a new one if you still need help.');
          } else {
            setError(err.message);
          }
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} onPaste={handlePaste} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-black/20">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        required
        placeholder="Write a reply (you can paste images)"
        disabled={reply.isPending}
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
      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={files.length >= MAX_ATTACHMENTS || reply.isPending}
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
        <button
          type="submit"
          disabled={reply.isPending || !body.trim()}
          className="rounded-lg bg-[#f5d66a] px-3 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {reply.isPending ? 'Sending...' : 'Send reply'}
        </button>
      </div>
    </form>
  );
}
