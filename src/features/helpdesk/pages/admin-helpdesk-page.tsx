import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, UserCheck } from 'lucide-react';
import { useToastStore } from '@/store';
import { useHelpdeskAccess } from '@/features/helpdesk/hooks/use-helpdesk-access';
import { useInvalidateQueueCounts, useQueueCounts } from '@/features/helpdesk/hooks/use-queue-counts';
import {
  ADMIN_TICKETS_PAGE_SIZE,
  acknowledgeAdminTicket,
  assignAdminTicket,
  closeAdminHelpdeskTicket,
  createAdminHelpdeskComment,
  escalateAdminTicket,
  fetchAdminAssignees,
  fetchAdminHelpdeskTicketDetail,
  fetchAdminHelpdeskTickets,
  patchAdminHelpdeskTicket,
  type AdminTicketDetail,
  type AdminTicketFilters,
  type AdminTicketListItem,
  type AdminTicketView,
  type HelpdeskCategory,
  type HelpdeskPriority,
  type HelpdeskStatus,
  type HelpdeskTier,
  type StaffQueueCounts,
} from '@/features/helpdesk/services/helpdesk-service';
import { TicketAttachmentsSection } from '@/features/helpdesk/components/attachment-strip';
import { EscalateDialog } from '@/features/helpdesk/components/escalate-dialog';
import { OverdueBanner } from '@/features/helpdesk/components/overdue-banner';
import { QueueTabs, type QueueTab } from '@/features/helpdesk/components/queue-tabs';
import { SupportContextPanel } from '@/features/helpdesk/components/support-context-panel';
import { TicketConversation } from '@/features/helpdesk/components/ticket-conversation';
import {
  QueueStateBadge,
  SlaBadge,
  SlaSummary,
  TicketSourceBadge,
  TicketTierBadge,
} from '@/features/helpdesk/components/ticket-badges';
import { queueStateRowClass } from '@/features/helpdesk/queue-state';
import { HELPDESK_TIER_DESCRIPTIONS, formatHelpdeskDate } from '@/features/helpdesk/constants';

const STATUS_OPTIONS: Array<{ value: HelpdeskStatus; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_on_user', label: 'Waiting on user' },
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

const TIER_OPTIONS: Array<{ value: HelpdeskTier; label: string }> = [
  { value: 'l1', label: 'L1 (SMD office)' },
  { value: 'l2', label: 'L2 (Central support)' },
  { value: 'l3', label: 'L3 (Engineering)' },
];

/** Tabs of the staff queue; most map to a backend `view`, `l3` to `tier=l3`, `all` to no view. */
type StaffViewKey = AdminTicketView | 'l3' | 'all';

const STAFF_VIEW_KEYS: StaffViewKey[] = ['needs_action', 'at_risk', 'mine', 'unassigned', 'waiting', 'l1', 'l3', 'resolved', 'all'];

/** Narrow a `?view=` value to a known tab, or null. */
function parseStaffView(value: string | null): StaffViewKey | null {
  return value && (STAFF_VIEW_KEYS as string[]).includes(value) ? (value as StaffViewKey) : null;
}

/** List filters contributed by a tab. */
function viewFilters(view: StaffViewKey): Pick<AdminTicketFilters, 'view' | 'tier'> {
  if (view === 'all') return {};
  if (view === 'l3') return { tier: 'l3' };
  return { view };
}

const SELECT_CLASS =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/20 dark:bg-black/30 dark:text-white';
const OPTION_CLASS = 'bg-white text-slate-900 dark:bg-[#0f131c] dark:text-white';
const SECONDARY_BUTTON =
  'inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/25 dark:hover:bg-white/10';

/** Build the tab strip from the staff counters. */
function buildStaffTabs(counts: StaffQueueCounts | null | undefined, canEngineer: boolean): Array<QueueTab<StaffViewKey>> {
  const tabs: Array<QueueTab<StaffViewKey>> = [
    { key: 'needs_action', label: 'Needs action', count: counts?.needs_action, emphasize: true },
    { key: 'at_risk', label: 'At risk', count: counts ? counts.due_soon + counts.breached : undefined },
    { key: 'mine', label: 'Mine', count: counts?.mine_open },
    { key: 'unassigned', label: 'Unassigned', count: counts?.unassigned },
    { key: 'waiting', label: 'Waiting on user', count: counts?.waiting_on_user },
    { key: 'l1', label: 'L1 (assistants)', count: counts?.l1_open },
  ];
  if (canEngineer) tabs.push({ key: 'l3', label: 'L3 (engineering)', count: counts?.l3_open });
  tabs.push({ key: 'resolved', label: 'Resolved' }, { key: 'all', label: 'All' });
  return tabs;
}

/**
 * Staff view of helpdesk tickets: queue tabs (`?view=`), filters, a paginated
 * list and a detail pane.
 *
 * Who may open the page is decided by the route guard (helpdesk:read). Editing
 * (status/priority, assignment, escalation, comments, close) additionally needs
 * helpdesk:update; without it the page is read-only. A `?ticket=HD-...` query
 * param (used by in-app notification links) filters the list to that ticket and
 * opens it. Explicitly opening a ticket that needs action (row click or link)
 * acknowledges it ("received"); the auto-opened first row offers "Mark as received".
 */
export default function AdminHelpdeskPage() {
  const addToast = useToastStore((state) => state.addToast);
  const { data: access } = useHelpdeskAccess();
  const canUpdate = Boolean(access?.can_update);
  const canEngineer = Boolean(access?.can_engineer);
  const { data: queueCounts } = useQueueCounts();
  const invalidateCounts = useInvalidateQueueCounts();

  const [searchParams, setSearchParams] = useSearchParams();
  const urlTicket = (searchParams.get('ticket') || '').trim();
  // A deep link to one ticket shows it whatever its state; otherwise "Needs action".
  const view: StaffViewKey = parseStaffView(searchParams.get('view')) ?? (urlTicket ? 'all' : 'needs_action');

  const [statusFilter, setStatusFilter] = useState<HelpdeskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<HelpdeskPriority | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<HelpdeskCategory | ''>('');
  const [tierFilter, setTierFilter] = useState<HelpdeskTier | ''>('');
  const [ticketFilter, setTicketFilter] = useState(urlTicket);
  const [emailFilter, setEmailFilter] = useState('');

  const [tickets, setTickets] = useState<AdminTicketListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicketNumber, setSelectedTicketNumber] = useState<string | null>(urlTicket || null);
  // The ticket the user explicitly chose (row click or ?ticket= link). Only that one is
  // acknowledged on open; the auto-opened first row is not. The ref is read inside the
  // detail effect so changing it doesn't reload the detail.
  const [explicitTicket, setExplicitTicket] = useState<string | null>(urlTicket || null);
  const explicitTicketRef = useRef<string | null>(urlTicket || null);

  const [detail, setDetail] = useState<AdminTicketDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [draftStatus, setDraftStatus] = useState<HelpdeskStatus>('open');
  const [draftPriority, setDraftPriority] = useState<HelpdeskPriority>('medium');
  const [savingTicket, setSavingTicket] = useState(false);

  const [commentBody, setCommentBody] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [postingComment, setPostingComment] = useState(false);

  const [escalateOpen, setEscalateOpen] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / ADMIN_TICKETS_PAGE_SIZE));
  const tabs = useMemo(() => buildStaffTabs(queueCounts?.staff, canEngineer), [queueCounts?.staff, canEngineer]);

  // Assign dropdown options for the open ticket's tier (L1 is worked by the SMD office).
  const assignTier = detail?.tier === 'l2' || detail?.tier === 'l3' ? detail.tier : null;
  const { data: assignees = [] } = useQuery({
    queryKey: ['helpdesk', 'assignees', assignTier],
    queryFn: () => fetchAdminAssignees(assignTier as 'l2' | 'l3'),
    enabled: canUpdate && Boolean(assignTier),
    staleTime: 5 * 60 * 1000,
  });

  /** Current filter values in the shape the list endpoint expects. */
  const currentFilters = useCallback((): AdminTicketFilters => {
    const fromView = viewFilters(view);
    return {
      ticket: ticketFilter,
      email: emailFilter,
      status: statusFilter,
      priority: priorityFilter,
      category: categoryFilter,
      view: fromView.view,
      // An explicit tier filter wins over the L3 tab's implied one.
      tier: tierFilter || fromView.tier,
    };
  }, [categoryFilter, emailFilter, priorityFilter, statusFilter, ticketFilter, tierFilter, view]);

  /** Apply a filter change and go back to the first page in the same render. */
  const changeFilter = <T,>(setter: (value: T) => void, value: T) => {
    setter(value);
    setPage(1);
  };

  /** Switch tab: mirror it in `?view=` and drop a deep-linked ticket filter. */
  const changeView = (next: StaffViewKey) => {
    const params = new URLSearchParams(searchParams);
    params.set('view', next);
    if (urlTicket) {
      params.delete('ticket');
      if (ticketFilter === urlTicket) setTicketFilter('');
    }
    setSearchParams(params, { replace: true });
    setPage(1);
  };

  /** Copy queue fields from a fresh detail onto its list row (e.g. after acknowledge). */
  const mergeRow = useCallback((updated: AdminTicketDetail) => {
    setTickets((rows) =>
      rows.map((row) =>
        row.ticket_number === updated.ticket_number
          ? {
              ...row,
              status: updated.status,
              priority: updated.priority,
              tier: updated.tier,
              assignee: updated.assignee,
              queue_state: updated.queue_state,
              needs_action: updated.needs_action,
            }
          : row
      )
    );
  }, []);

  /** Show a ticket in the detail pane and reset the edit drafts to it. */
  const showDetail = useCallback((loaded: AdminTicketDetail) => {
    setDetail(loaded);
    setDraftStatus(loaded.status);
    setDraftPriority(loaded.priority);
  }, []);

  // A notification link (?ticket=) arriving while already on this page: filter to
  // that ticket and open it. On first mount the initial state already did this.
  useEffect(() => {
    if (!urlTicket) return;
    setTicketFilter(urlTicket);
    setSelectedTicketNumber(urlTicket);
    explicitTicketRef.current = urlTicket;
    setExplicitTicket(urlTicket);
    setPage(1);
  }, [urlTicket]);

  useEffect(() => {
    const loadTickets = async () => {
      setLoadingTickets(true);
      try {
        const loaded = await fetchAdminHelpdeskTickets(currentFilters(), page);
        setTickets(loaded.results);
        setTotalCount(loaded.count);

        if (loaded.results.length > 0) {
          setSelectedTicketNumber((current) => current ?? loaded.results[0].ticket_number);
        } else if (!urlTicket) {
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
  }, [addToast, currentFilters, page, urlTicket]);

  useEffect(() => {
    if (!selectedTicketNumber) return;
    let cancelled = false;

    const loadDetail = async () => {
      setLoadingDetail(true);
      try {
        let loadedDetail = await fetchAdminHelpdeskTicketDetail(selectedTicketNumber);
        // Explicitly opening a ticket that needs action marks it received (no-op unless
        // we own it). An auto-opened ticket waits for "Mark as received".
        if (loadedDetail.needs_action && explicitTicketRef.current === selectedTicketNumber) {
          try {
            loadedDetail = await acknowledgeAdminTicket(selectedTicketNumber);
            invalidateCounts();
          } catch {
            // Not ours to acknowledge, or an older backend: keep the plain detail.
          }
        }
        if (cancelled) return;
        showDetail(loadedDetail);
        mergeRow(loadedDetail);
      } catch (error) {
        if (cancelled) return;
        addToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to load ticket detail.',
        });
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    };

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [addToast, invalidateCounts, mergeRow, selectedTicketNumber, showDetail]);

  /** Acknowledge the open ticket ("Mark as received"). */
  const acknowledgeOpenTicket = async (ticketNumber: string) => {
    try {
      const updated = await acknowledgeAdminTicket(ticketNumber);
      showDetail(updated);
      mergeRow(updated);
      invalidateCounts();
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to acknowledge ticket.' });
    }
  };

  /** Row click: an explicit choice, so it is acknowledged (also when it was already auto-opened). */
  const selectTicket = (ticketNumber: string) => {
    explicitTicketRef.current = ticketNumber;
    setExplicitTicket(ticketNumber);
    if (ticketNumber === selectedTicketNumber) {
      if (detail?.ticket_number === ticketNumber && detail.needs_action) void acknowledgeOpenTicket(ticketNumber);
      return;
    }
    setSelectedTicketNumber(ticketNumber);
  };

  /** Reload the current list page after a change to a ticket. */
  const refreshTickets = async () => {
    invalidateCounts();
    const loaded = await fetchAdminHelpdeskTickets(currentFilters(), page);
    setTickets(loaded.results);
    setTotalCount(loaded.count);
  };

  /** Run a ticket action that returns the updated detail, then refresh list + counts. */
  const runTicketAction = async (action: () => Promise<AdminTicketDetail>, successMessage: string, failMessage: string) => {
    setSavingTicket(true);
    try {
      const updated = await action();
      showDetail(updated);
      await refreshTickets();
      addToast({ type: 'success', message: successMessage });
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : failMessage });
    } finally {
      setSavingTicket(false);
    }
  };

  const handleSaveTicket = () => {
    if (!detail) return;
    void runTicketAction(
      () => patchAdminHelpdeskTicket(detail.ticket_number, { status: draftStatus, priority: draftPriority }),
      'Ticket updated.',
      'Failed to update ticket.'
    );
  };

  const handleCloseTicket = () => {
    if (!detail) return;
    void runTicketAction(
      async () => {
        await closeAdminHelpdeskTicket(detail.ticket_number);
        return fetchAdminHelpdeskTicketDetail(detail.ticket_number);
      },
      'Ticket closed.',
      'Failed to close ticket.'
    );
  };

  const handleAssign = (assignee: 'me' | number | null) => {
    if (!detail) return;
    void runTicketAction(
      () => assignAdminTicket(detail.ticket_number, assignee),
      assignee === null ? 'Ticket unassigned.' : 'Ticket assigned.',
      'Failed to assign ticket.'
    );
  };

  /** Escalate (L2 → L3) or send back (L3 → L2); errors keep the dialog open. */
  const handleEscalate = async (reason: string) => {
    if (!detail) return;
    const to = detail.tier === 'l3' ? 'l2' : 'l3';
    const updated = await escalateAdminTicket(detail.ticket_number, { to, reason });
    showDetail(updated);
    await refreshTickets();
    addToast({ type: 'success', message: to === 'l3' ? 'Escalated to engineering (L3).' : 'Sent back to central support (L2).' });
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
      showDetail(updated);
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

  const escalation =
    detail?.tier === 'l2'
      ? {
          button: 'Escalate to L3',
          title: 'Escalate to engineering (L3)',
          description: 'Engineering will be notified. The ticket becomes unassigned in the L3 queue.',
          confirm: 'Escalate',
        }
      : detail?.tier === 'l3'
        ? {
            button: 'Send back to L2',
            title: 'Send back to central support (L2)',
            description: 'Central support will be notified. The ticket becomes unassigned in the L2 queue.',
            confirm: 'Send back',
          }
        : null;

  return (
    <div className="h-full min-h-0 p-4 flex flex-col gap-4 text-slate-900 dark:text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Support Queue</h1>
          <p className="text-xs text-slate-600 dark:text-white/65">Review, assign, reply to, and resolve support requests.</p>
        </div>
      </div>

      <OverdueBanner
        section="staff"
        breached={queueCounts?.staff?.breached ?? 0}
        onShowAtRisk={view === 'at_risk' ? undefined : () => changeView('at_risk')}
      />

      <QueueTabs label="Ticket views" tabs={tabs} active={view} onChange={changeView} />

      <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-3 xl:grid-cols-6 dark:border-white/10 dark:bg-white/5">
        <input
          type="text"
          value={ticketFilter}
          onChange={(e) => changeFilter(setTicketFilter, e.target.value)}
          placeholder="Ticket # (e.g. HD-001)"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 dark:border-white/20 dark:bg-black/30 dark:text-white dark:placeholder:text-white/50"
        />
        <input
          type="email"
          value={emailFilter}
          onChange={(e) => changeFilter(setEmailFilter, e.target.value)}
          placeholder="Email"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 dark:border-white/20 dark:bg-black/30 dark:text-white dark:placeholder:text-white/50"
        />
        <select
          value={statusFilter}
          onChange={(e) => changeFilter(setStatusFilter, e.target.value as HelpdeskStatus | '')}
          className={SELECT_CLASS}
          aria-label="Status"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((item) => (
            <option key={item.value} value={item.value} className={OPTION_CLASS}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => changeFilter(setPriorityFilter, e.target.value as HelpdeskPriority | '')}
          className={SELECT_CLASS}
          aria-label="Priority"
        >
          <option value="">All Priorities</option>
          {PRIORITY_OPTIONS.map((item) => (
            <option key={item.value} value={item.value} className={OPTION_CLASS}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => changeFilter(setCategoryFilter, e.target.value as HelpdeskCategory | '')}
          className={SELECT_CLASS}
          aria-label="Category"
        >
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map((item) => (
            <option key={item.value} value={item.value} className={OPTION_CLASS}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          value={tierFilter}
          onChange={(e) => changeFilter(setTierFilter, e.target.value as HelpdeskTier | '')}
          className={SELECT_CLASS}
          aria-label="Tier"
        >
          <option value="">All Tiers</option>
          {TIER_OPTIONS.map((item) => (
            <option key={item.value} value={item.value} className={OPTION_CLASS}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[400px_1fr]">
        <section className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="min-h-0 flex-1 overflow-auto">
            {loadingTickets ? (
              <div className="p-4 text-sm text-slate-600 dark:text-white/70">Loading tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="p-4 text-sm text-slate-600 dark:text-white/70">
                {view === 'needs_action'
                  ? 'Nothing needs you right now.'
                  : view === 'at_risk'
                    ? 'No tickets are due soon or overdue.'
                    : 'No tickets found for the current filters.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-white/10">
                {tickets.map((ticket) => (
                  <StaffTicketRow
                    key={ticket.ticket_number}
                    ticket={ticket}
                    selected={selectedTicketNumber === ticket.ticket_number}
                    onSelect={() => selectTicket(ticket.ticket_number)}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-2 text-xs text-slate-600 dark:border-white/10 dark:text-white/70">
            <button
              type="button"
              className="rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={loadingTickets || page <= 1}
            >
              Prev
            </button>
            <span>
              Page {page} of {totalPages} ({totalCount} tickets)
            </span>
            <button
              type="button"
              className="rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={loadingTickets || page >= totalPages}
            >
              Next
            </button>
          </div>
        </section>

        <section className="min-h-0 overflow-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          {loadingDetail ? (
            <div className="text-sm text-slate-600 dark:text-white/70">Loading ticket details...</div>
          ) : !detail ? (
            <div className="text-sm text-slate-600 dark:text-white/70">Select a ticket to view details.</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-black/20">
                <div className="flex flex-wrap items-center gap-2">
                  <span><strong>Ticket:</strong> {detail.ticket_number}</span>
                  <TicketTierBadge tier={detail.tier} />
                  <QueueStateBadge state={detail.queue_state} />
                  <SlaBadge ticket={detail} variant="detail" />
                  <TicketSourceBadge source={detail.source} />
                </div>
                <SlaSummary ticket={detail} firstResponseAt={detail.first_response_at} className="mb-1" />
                <div><strong>Name:</strong> {detail.name}</div>
                {detail.reported_by_name ? (
                  <div><strong>Reported by:</strong> {detail.reported_by_name} (assistant)</div>
                ) : null}
                <div><strong>Email:</strong> {detail.email}</div>
                <div><strong>Category:</strong> {detail.category}</div>
                <div><strong>Subject:</strong> {detail.subject}</div>
                {detail.tier ? (
                  <div><strong>Queue:</strong> {HELPDESK_TIER_DESCRIPTIONS[detail.tier] ?? detail.tier}</div>
                ) : null}
                {detail.smd ? <div><strong>SMD:</strong> {detail.smd.name}</div> : null}
                {detail.tier && detail.tier !== 'l1' ? (
                  <div><strong>Assignee:</strong> {detail.assignee?.name ?? 'Unassigned'}</div>
                ) : null}
                {detail.page_path ? (
                  <div><strong>Page:</strong> <span className="font-mono text-xs">{detail.page_path}</span></div>
                ) : null}
                {!canUpdate && (
                  <div>
                    <strong>Status:</strong> {STATUS_OPTIONS.find((item) => item.value === detail.status)?.label || detail.status}
                    {' | '}
                    <strong>Priority:</strong> {PRIORITY_OPTIONS.find((item) => item.value === detail.priority)?.label || detail.priority}
                  </div>
                )}
                <div className="mt-2 whitespace-pre-wrap"><strong>Description:</strong> {detail.description}</div>
                <div className="mt-2 text-xs text-slate-600 dark:text-white/65">
                  Created: {formatHelpdeskDate(detail.created_at)} | Updated: {formatHelpdeskDate(detail.updated_at)}
                  {detail.first_response_at ? ` | First response: ${formatHelpdeskDate(detail.first_response_at)}` : ''}
                </div>
              </div>

              {detail.needs_action && explicitTicket !== detail.ticket_number ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:border-sky-300/20 dark:bg-sky-500/10 dark:text-sky-50">
                  <span>This ticket needs action and hasn&apos;t been marked as received yet.</span>
                  <button type="button" className={SECONDARY_BUTTON} onClick={() => void acknowledgeOpenTicket(detail.ticket_number)}>
                    <CheckCircle2 className="h-4 w-4" /> Mark as received
                  </button>
                </div>
              ) : null}

              {detail.escalated_at ? (
                <div className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs text-indigo-900 dark:border-indigo-300/20 dark:bg-indigo-500/10 dark:text-indigo-50">
                  <strong>Escalated {formatHelpdeskDate(detail.escalated_at)}</strong>
                  {detail.escalation_reason ? <div className="mt-1 whitespace-pre-wrap">{detail.escalation_reason}</div> : null}
                </div>
              ) : null}

              <TicketAttachmentsSection attachments={detail.attachments} comments={detail.comments} />

              <SupportContextPanel context={detail.context} />

              {!canUpdate && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-300/20 dark:bg-amber-500/10 dark:text-amber-50">
                  Read-only: you can view tickets but not change, reply to, or close them.
                </div>
              )}

              {canUpdate && assignTier && (
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className={SECONDARY_BUTTON} onClick={() => handleAssign('me')} disabled={savingTicket}>
                    <UserCheck className="h-4 w-4" /> Assign to me
                  </button>
                  <select
                    value={detail.assignee?.id ?? ''}
                    onChange={(e) => handleAssign(e.target.value ? Number(e.target.value) : null)}
                    className={SELECT_CLASS}
                    disabled={savingTicket}
                    aria-label="Assignee"
                  >
                    <option value="" className={OPTION_CLASS}>Unassigned</option>
                    {/* Keep the current assignee selectable even if they left the list. */}
                    {detail.assignee && !assignees.some((person) => person.id === detail.assignee?.id) ? (
                      <option value={detail.assignee.id} className={OPTION_CLASS}>{detail.assignee.name}</option>
                    ) : null}
                    {assignees.map((person) => (
                      <option key={person.id} value={person.id} className={OPTION_CLASS}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                  {escalation ? (
                    <button type="button" className={SECONDARY_BUTTON} onClick={() => setEscalateOpen(true)} disabled={savingTicket}>
                      {detail.tier === 'l3' ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
                      {escalation.button}
                    </button>
                  ) : null}
                </div>
              )}

              {canUpdate && (
                <div className="grid gap-2 md:grid-cols-3">
                  <select
                    value={draftStatus}
                    onChange={(e) => setDraftStatus(e.target.value as HelpdeskStatus)}
                    className={SELECT_CLASS}
                    disabled={savingTicket}
                    aria-label="Status"
                  >
                    {STATUS_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value} className={OPTION_CLASS}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={draftPriority}
                    onChange={(e) => setDraftPriority(e.target.value as HelpdeskPriority)}
                    className={SELECT_CLASS}
                    disabled={savingTicket}
                    aria-label="Priority"
                  >
                    {PRIORITY_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value} className={OPTION_CLASS}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex-1 rounded-lg bg-[#f5d66a] px-3 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={handleSaveTicket}
                      disabled={savingTicket}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className={`flex-1 ${SECONDARY_BUTTON}`}
                      onClick={handleCloseTicket}
                      disabled={savingTicket || detail.status === 'closed'}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-black/20">
                <h3 className="mb-2 text-sm font-semibold">Comments</h3>
                <div className="max-h-[320px] overflow-auto pr-1">
                  <TicketConversation comments={detail.comments} />
                </div>
              </div>

              {canUpdate && (
                <form onSubmit={handleAddComment} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-black/20">
                  <textarea
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    rows={4}
                    placeholder={isInternalComment ? 'Internal note (not visible to the requester)' : 'Write a reply to the requester'}
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 dark:text-white dark:placeholder:text-white/50 ${
                      isInternalComment
                        ? 'border-dashed border-amber-400 bg-amber-50/70 dark:border-amber-300/40 dark:bg-amber-500/10'
                        : 'border-slate-300 bg-white dark:border-white/20 dark:bg-black/30'
                    }`}
                    required
                    disabled={postingComment}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-white/80">
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
                      {postingComment ? 'Posting...' : isInternalComment ? 'Add note' : 'Send reply'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>
      </div>

      {escalation ? (
        <EscalateDialog
          open={escalateOpen}
          onOpenChange={setEscalateOpen}
          title={escalation.title}
          description={escalation.description}
          confirmLabel={escalation.confirm}
          onConfirm={handleEscalate}
        />
      ) : null}
    </div>
  );
}

/** One list row: state highlighting, tier, assignee/SMD and counts. */
function StaffTicketRow({
  ticket,
  selected,
  onSelect,
}: {
  ticket: AdminTicketListItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      className={`w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-white/10 ${selected ? 'bg-slate-100 dark:bg-white/10' : ''} ${queueStateRowClass(ticket.queue_state)}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-[#c9a227] dark:text-[#f5d66a]">{ticket.ticket_number}</span>
          <TicketTierBadge tier={ticket.tier} />
        </span>
        <span className="flex flex-wrap justify-end gap-1">
          <SlaBadge ticket={ticket} />
          <QueueStateBadge state={ticket.queue_state} />
          <TicketSourceBadge source={ticket.source} />
        </span>
      </div>
      <div className="truncate text-sm text-slate-900 dark:text-white">{ticket.subject}</div>
      <div className="mt-1 text-xs font-normal text-slate-600 dark:text-white/70">
        {ticket.status} - {ticket.priority} - {ticket.comment_count} comments
        {ticket.attachment_count ? ` - ${ticket.attachment_count} image${ticket.attachment_count === 1 ? '' : 's'}` : ''}
      </div>
      {ticket.tier ? (
        <div className="mt-0.5 truncate text-[11px] font-normal text-slate-500 dark:text-white/55">
          {ticket.tier === 'l1'
            ? `SMD: ${ticket.smd?.name ?? 'unknown'}`
            : `Assignee: ${ticket.assignee?.name ?? 'Unassigned'}`}
        </div>
      ) : null}
      {ticket.page_path ? (
        <div className="mt-0.5 truncate font-mono text-[11px] font-normal text-slate-500 dark:text-white/50">{ticket.page_path}</div>
      ) : null}
    </button>
  );
}
