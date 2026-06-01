import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useToastStore } from '@/store';
import { useAuth } from '@/features/auth';
import {
  closeAdminHelpdeskTicket,
  createAdminHelpdeskComment,
  fetchAdminHelpdeskTicketDetail,
  fetchAdminHelpdeskTickets,
  patchAdminHelpdeskTicket,
  type AdminTicketDetail,
  type AdminTicketListItem,
  type HelpdeskCategory,
  type HelpdeskPriority,
  type HelpdeskStatus,
} from '@/features/helpdesk/services/helpdesk-service';

const STATUS_OPTIONS: Array<{ value: HelpdeskStatus; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const PRIORITY_OPTIONS: Array<{ value: HelpdeskPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const CATEGORY_OPTIONS: Array<{ value: HelpdeskCategory; label: string }> = [
  { value: 'login', label: 'Cannot Login' },
  { value: 'access', label: 'Access Denied' },
  { value: 'password_reset', label: 'Password Reset' },
  { value: 'team_visibility', label: 'Cannot See Correct Team' },
  { value: 'file_visibility', label: 'Cannot See Correct Files' },
  { value: 'other', label: 'Other' },
];

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function isAdminRole(roles: string[] | undefined): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((role) => role.trim().toUpperCase().replace(/[\s-]+/g, '_') === 'ADMIN');
}

export default function AdminHelpdeskPage() {
  const { user } = useAuth();
  const addToast = useToastStore((state) => state.addToast);

  const [statusFilter, setStatusFilter] = useState<HelpdeskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<HelpdeskPriority | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<HelpdeskCategory | ''>('');

  const [tickets, setTickets] = useState<AdminTicketListItem[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicketNumber, setSelectedTicketNumber] = useState<string | null>(null);

  const [detail, setDetail] = useState<AdminTicketDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [draftStatus, setDraftStatus] = useState<HelpdeskStatus>('open');
  const [draftPriority, setDraftPriority] = useState<HelpdeskPriority>('medium');
  const [savingTicket, setSavingTicket] = useState(false);

  const [commentBody, setCommentBody] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [postingComment, setPostingComment] = useState(false);

  const canAccess = useMemo(() => isAdminRole(user?.roles), [user?.roles]);

  useEffect(() => {
    if (!canAccess) return;

    const loadTickets = async () => {
      setLoadingTickets(true);
      try {
        const loaded = await fetchAdminHelpdeskTickets({
          status: statusFilter,
          priority: priorityFilter,
          category: categoryFilter,
        });
        setTickets(loaded);

        if (loaded.length > 0 && !selectedTicketNumber) {
          setSelectedTicketNumber(loaded[0].ticket_number);
        }
        if (loaded.length === 0) {
          setSelectedTicketNumber(null);
          setDetail(null);
        }
      } catch (error) {
        addToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to load helpdesk tickets.',
        });
      } finally {
        setLoadingTickets(false);
      }
    };

    void loadTickets();
  }, [addToast, canAccess, categoryFilter, priorityFilter, statusFilter]);

  useEffect(() => {
    if (!canAccess || !selectedTicketNumber) return;

    const loadDetail = async () => {
      setLoadingDetail(true);
      try {
        const loadedDetail = await fetchAdminHelpdeskTicketDetail(selectedTicketNumber);
        setDetail(loadedDetail);
        setDraftStatus(loadedDetail.status);
        setDraftPriority(loadedDetail.priority);
      } catch (error) {
        addToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to load ticket detail.',
        });
      } finally {
        setLoadingDetail(false);
      }
    };

    void loadDetail();
  }, [addToast, canAccess, selectedTicketNumber]);

  const refreshTickets = async () => {
    const loaded = await fetchAdminHelpdeskTickets({
      status: statusFilter,
      priority: priorityFilter,
      category: categoryFilter,
    });
    setTickets(loaded);
  };

  const handleSaveTicket = async () => {
    if (!detail) return;
    setSavingTicket(true);
    try {
      const updated = await patchAdminHelpdeskTicket(detail.ticket_number, {
        status: draftStatus,
        priority: draftPriority,
      });
      setDetail(updated);
      await refreshTickets();
      addToast({ type: 'success', message: 'Ticket updated.' });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update ticket.',
      });
    } finally {
      setSavingTicket(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!detail) return;
    setSavingTicket(true);
    try {
      await closeAdminHelpdeskTicket(detail.ticket_number);
      const updated = await fetchAdminHelpdeskTicketDetail(detail.ticket_number);
      setDetail(updated);
      setDraftStatus(updated.status);
      setDraftPriority(updated.priority);
      await refreshTickets();
      addToast({ type: 'success', message: 'Ticket closed.' });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to close ticket.',
      });
    } finally {
      setSavingTicket(false);
    }
  };

  const handleAddComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!detail || !commentBody.trim()) return;

    setPostingComment(true);
    try {
      await createAdminHelpdeskComment(detail.ticket_number, {
        body: commentBody.trim(),
        is_internal: isInternalComment,
      });
      const updated = await fetchAdminHelpdeskTicketDetail(detail.ticket_number);
      setDetail(updated);
      setCommentBody('');
      setIsInternalComment(false);
      await refreshTickets();
      addToast({ type: 'success', message: 'Comment posted.' });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to post comment.',
      });
    } finally {
      setPostingComment(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          You do not have permission to view Helpdesk admin.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full min-h-0 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Helpdesk Admin</h1>
          <p className="text-xs text-white/65">Review, reply, and resolve support requests.</p>
        </div>
      </div>

      <div className="grid gap-2 rounded-xl border border-white/10 bg-white/5 p-3 md:grid-cols-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as HelpdeskStatus | '')}
          className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((item) => (
            <option key={item.value} value={item.value} className="bg-[#0f131c]">
              {item.label}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as HelpdeskPriority | '')}
          className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
        >
          <option value="">All Priorities</option>
          {PRIORITY_OPTIONS.map((item) => (
            <option key={item.value} value={item.value} className="bg-[#0f131c]">
              {item.label}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as HelpdeskCategory | '')}
          className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
        >
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map((item) => (
            <option key={item.value} value={item.value} className="bg-[#0f131c]">
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[380px_1fr]">
        <section className="min-h-0 overflow-auto rounded-xl border border-white/10 bg-white/5">
          {loadingTickets ? (
            <div className="p-4 text-sm text-white/70">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="p-4 text-sm text-white/70">No tickets found for the current filters.</div>
          ) : (
            <div className="divide-y divide-white/10">
              {tickets.map((ticket) => (
                <button
                  key={ticket.ticket_number}
                  type="button"
                  onClick={() => setSelectedTicketNumber(ticket.ticket_number)}
                  className={`w-full px-4 py-3 text-left hover:bg-white/10 ${selectedTicketNumber === ticket.ticket_number ? 'bg-white/10' : ''}`}
                >
                  <div className="text-sm font-semibold text-[#f5d66a]">{ticket.ticket_number}</div>
                  <div className="text-sm text-white truncate">{ticket.subject}</div>
                  <div className="mt-1 text-xs text-white/70">
                    {ticket.status} - {ticket.priority} - {ticket.comment_count} comments
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="min-h-0 overflow-auto rounded-xl border border-white/10 bg-white/5 p-4">
          {loadingDetail ? (
            <div className="text-sm text-white/70">Loading ticket details...</div>
          ) : !detail ? (
            <div className="text-sm text-white/70">Select a ticket to view details.</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
                <div><strong>Ticket:</strong> {detail.ticket_number}</div>
                <div><strong>Name:</strong> {detail.name}</div>
                <div><strong>Email:</strong> {detail.email}</div>
                <div><strong>Category:</strong> {detail.category}</div>
                <div><strong>Subject:</strong> {detail.subject}</div>
                <div className="mt-2 whitespace-pre-wrap"><strong>Description:</strong> {detail.description}</div>
                <div className="mt-2 text-xs text-white/65">
                  Created: {formatDate(detail.created_at)} | Updated: {formatDate(detail.updated_at)}
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                <select
                  value={draftStatus}
                  onChange={(e) => setDraftStatus(e.target.value as HelpdeskStatus)}
                  className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                  disabled={savingTicket}
                >
                  {STATUS_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value} className="bg-[#0f131c]">
                      {item.label}
                    </option>
                  ))}
                </select>
                <select
                  value={draftPriority}
                  onChange={(e) => setDraftPriority(e.target.value as HelpdeskPriority)}
                  className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                  disabled={savingTicket}
                >
                  {PRIORITY_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value} className="bg-[#0f131c]">
                      {item.label}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-lg bg-[#f5d66a] px-3 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void handleSaveTicket()}
                    disabled={savingTicket}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-lg border border-white/25 px-3 py-2 text-sm hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void handleCloseTicket()}
                    disabled={savingTicket || detail.status === 'closed'}
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <h3 className="mb-2 text-sm font-semibold">Comments</h3>
                <div className="max-h-[240px] space-y-2 overflow-auto pr-1">
                  {detail.comments.length === 0 ? (
                    <div className="text-xs text-white/65">No comments yet.</div>
                  ) : (
                    detail.comments.map((comment) => (
                      <div key={comment.id} className="rounded-md border border-white/10 bg-white/5 p-2 text-sm">
                        <div className="mb-1 text-xs text-white/70">
                          {(comment.author_name || 'Support Team')} - {formatDate(comment.created_at)}
                          {comment.is_internal ? ' - internal' : ''}
                        </div>
                        <div className="whitespace-pre-wrap">{comment.body}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <form onSubmit={handleAddComment} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  rows={4}
                  placeholder="Write a reply or internal note"
                  className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                  required
                  disabled={postingComment}
                />
                <div className="mt-2 flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-xs text-white/80">
                    <input
                      type="checkbox"
                      checked={isInternalComment}
                      onChange={(e) => setIsInternalComment(e.target.checked)}
                      disabled={postingComment}
                    />
                    Internal note (no email)
                  </label>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#f5d66a] px-3 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={postingComment}
                  >
                    {postingComment ? 'Posting...' : 'Add Comment'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
