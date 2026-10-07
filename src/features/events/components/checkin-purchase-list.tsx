import { Fragment, useState } from 'react';
import { Badge, Button } from '@shared/components';
import type { CheckinAttendee, CheckinPurchase } from '../types/checkin';
import { credentialLabel } from '../types/door';
import { TICKET_STATUS_LABEL } from '../utils/ticket-status';
import { SearchMatchLabel } from './search-match-label';
import { SEARCH_HIT_CLASS } from '../utils/purchase-search';

/**
 * `door` — what a person at the entrance needs: name, ticket, arrival, one big
 * Check in; unnamed tickets folded per purchase. `detailed` — the supervisor's
 * list: every ticket, its status, references, SMD and who admitted whom.
 */
export type CheckinListView = 'door' | 'detailed';

interface CheckinPurchaseListProps {
  purchases: CheckinPurchase[];
  view: CheckinListView;
  page: number;
  /** Total purchases matching the filters (all pages). */
  count: number;
  pageSize?: number;
  busyTicketId: number | null;
  /** Door view: tickets admitted from this device this visit — the only ones offering Undo there. */
  undoableIds: ReadonlySet<number>;
  onPageChange: (page: number) => void;
  onCheckIn: (attendee: CheckinAttendee) => void;
  onUndo: (attendee: CheckinAttendee) => void;
}

function arrivalTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** "via Morning session · BSCPro confirmation · by Kash" — how an arrival was recorded. */
function arrivalDetails(attendee: CheckinAttendee): string {
  return [
    attendee.checkin_source === 'SESSION' ? `via ${attendee.checkin_via_session || 'a session'}` : '',
    credentialLabel(attendee.checkin_credential),
    attendee.checked_in_by_name ? `by ${attendee.checked_in_by_name}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

/** "1 of 15 arrived · 14 unnamed" — plain words; colour is kept for rows that need attention. */
function purchaseSummary(purchase: CheckinPurchase): string {
  const parts = [
    `${purchase.arrived_count} of ${purchase.ticket_count} arrived`,
    purchase.unassigned_count ? `${purchase.unassigned_count} unnamed` : '',
    purchase.transferred_count ? `${purchase.transferred_count} transferred` : '',
  ];
  return parts.filter(Boolean).join(' · ');
}

/** Partner references and our purchase number — secondary, the buyer's name leads. */
function purchaseReferences(purchase: CheckinPurchase): string {
  const partner = purchase.channel && purchase.channel !== 'WB';
  return [
    purchase.invoice_number,
    partner ? `${purchase.channel} ${purchase.external_order_reference}`.trim() : '',
    partner && purchase.external_invoice_reference ? `Inv ${purchase.external_invoice_reference}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Door view: one ticket, one buyer — no group heading, the row says it all. */
function isSingleTicket(purchase: CheckinPurchase): boolean {
  return purchase.ticket_count === 1 && purchase.tickets.length === 1;
}

/** The purchase's heading row: buyer first, then references, counts and SMD. */
function PurchaseHeaderRow({
  purchase,
  view,
  columns,
}: {
  purchase: CheckinPurchase;
  view: CheckinListView;
  columns: number;
}) {
  return (
    <tr className="border-t-2 border-slate-200 bg-slate-50 dark:border-white/15 dark:bg-white/5">
      <td colSpan={columns} className="px-4 py-2">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1">
          <div className="min-w-0">
            <div className="text-sm text-slate-900 dark:text-white">
              <span
                className={`font-semibold ${purchase.search_match?.includes('buyer') ? SEARCH_HIT_CLASS : ''}`}
              >
                {purchase.purchaser_name || '—'}
              </span>
              {purchase.purchaser_email && purchase.purchaser_email !== purchase.purchaser_name ? (
                <span className="text-slate-500 dark:text-white/60"> · {purchase.purchaser_email}</span>
              ) : null}
            </div>
            <div className="text-xs text-slate-500 dark:text-white/50">{purchaseReferences(purchase)}</div>
            <SearchMatchLabel matches={purchase.search_match} />
          </div>
          <div className="text-right text-xs text-slate-600 dark:text-white/70">
            <div>{purchaseSummary(purchase)}</div>
            {view === 'detailed' && purchase.seller_name ? (
              <div className="text-slate-500 dark:text-white/50">SMD {purchase.seller_name}</div>
            ) : null}
          </div>
        </div>
      </td>
    </tr>
  );
}

/** One ticket: who attends, the ticket, (detailed) its status, arrival, and the action. */
function TicketRow({
  attendee,
  view,
  buyer,
  busy,
  canUndo,
  onCheckIn,
  onUndo,
}: {
  attendee: CheckinAttendee;
  view: CheckinListView;
  /** Door view, single-ticket purchase: the buyer, shown when it is someone else. */
  buyer?: { name: string; hit: boolean };
  busy: boolean;
  canUndo: boolean;
  onCheckIn: (attendee: CheckinAttendee) => void;
  onUndo: (attendee: CheckinAttendee) => void;
}) {
  const status = attendee.shown_status ?? attendee.assignment_status;
  const detailed = view === 'detailed';
  const details = arrivalDetails(attendee);
  const contact = attendee.holder_email || attendee.holder_phone;

  return (
    <tr
      className={`border-t border-slate-100 align-top dark:border-white/10 ${
        attendee.search_hit
          ? 'bg-amber-50 dark:bg-amber-400/10'
          : attendee.checked_in
            ? 'bg-emerald-50/70 dark:bg-emerald-500/[0.07]'
            : ''
      }`}
    >
      <td
        className={`px-4 py-2.5 ${attendee.search_hit ? 'border-l-4 border-amber-400' : ''}`}
        title={attendee.search_hit ? 'Matches your search' : undefined}
      >
        <div className="flex flex-wrap items-center gap-1.5 font-medium text-slate-900 dark:text-white">
          {attendee.holder_name || (
            <span className="font-normal italic text-slate-500 dark:text-white/50">Unnamed ticket</span>
          )}
          {detailed && attendee.holder_linked ? (
            <Badge variant="outline" title="Ticket is linked to a platform account">
              Linked
            </Badge>
          ) : null}
        </div>
        {contact ? <div className="text-xs text-slate-500 dark:text-white/50">{contact}</div> : null}
        {buyer && buyer.name && buyer.name !== attendee.holder_name ? (
          <div className="text-xs text-slate-500 dark:text-white/50">
            Bought by <span className={buyer.hit ? SEARCH_HIT_CLASS : undefined}>{buyer.name}</span>
          </div>
        ) : null}
        {/* Phones: the ticket column is hidden, so its number rides under the name. */}
        <div className="text-xs text-slate-500 sm:hidden dark:text-white/50">{attendee.ticket_number}</div>
      </td>
      <td className="hidden px-4 py-2.5 sm:table-cell">
        <div className="text-slate-700 dark:text-white/80">{attendee.ticket_number}</div>
        {attendee.source === 'BSCPRO' && attendee.external_reference ? (
          <div className="text-xs text-slate-500 dark:text-white/50">BSCPro {attendee.external_reference}</div>
        ) : null}
      </td>
      {detailed ? (
        <td className="px-4 py-2.5">
          {status === 'ASSIGNED' ? (
            <span className="text-slate-500 dark:text-white/60">{TICKET_STATUS_LABEL[status]}</span>
          ) : (
            <Badge variant={status === 'UNASSIGNED' ? 'warning' : 'info'}>{TICKET_STATUS_LABEL[status]}</Badge>
          )}
        </td>
      ) : null}
      <td className="px-4 py-2.5" title={!detailed && details ? details : undefined}>
        {attendee.checked_in ? (
          <>
            <div className="font-medium text-emerald-700 dark:text-emerald-400">
              ✓ {arrivalTime(attendee.checked_in_at)}
            </div>
            {detailed && details ? (
              <div className="text-xs text-slate-500 dark:text-white/50">{details}</div>
            ) : null}
          </>
        ) : (
          <span className="text-slate-400 dark:text-white/40">{detailed ? 'Not arrived' : '—'}</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        {attendee.checked_in ? (
          canUndo ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onUndo(attendee)}
              className="text-sm text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline disabled:opacity-50 dark:text-white/60 dark:hover:text-white"
            >
              Undo
            </button>
          ) : null
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => onCheckIn(attendee)}
            className={detailed ? undefined : 'h-10 px-4 text-sm'}
          >
            Check in
          </Button>
        )}
      </td>
    </tr>
  );
}

/**
 * The door list as one table with one header, grouped by purchase like the
 * Purchases page, so columns line up from the first purchase to the last.
 *
 * Door view folds a purchase's unnamed tickets (unless the search named one)
 * into a single row with "Check in next unnamed" — a block of fifteen tickets
 * with fourteen unnamed is one named row and one fold, not fifteen rows.
 */
export function CheckinPurchaseList({
  purchases,
  view,
  page,
  count,
  pageSize = 25,
  busyTicketId,
  undoableIds,
  onPageChange,
  onCheckIn,
  onUndo,
}: CheckinPurchaseListProps) {
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());
  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  const detailed = view === 'detailed';
  const columns = detailed ? 5 : 4;

  const toggle = (purchaseId: number) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(purchaseId)) next.delete(purchaseId);
      else next.add(purchaseId);
      return next;
    });

  if (purchases.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
        No purchases match this search.
      </p>
    );
  }

  const row = (attendee: CheckinAttendee, buyer?: { name: string; hit: boolean }) => (
    <TicketRow
      key={attendee.id}
      attendee={attendee}
      view={view}
      buyer={buyer}
      busy={busyTicketId === attendee.id}
      canUndo={detailed || undoableIds.has(attendee.id)}
      onCheckIn={onCheckIn}
      onUndo={onUndo}
    />
  );

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
        <table className={`w-full table-fixed border-collapse text-sm ${detailed ? 'min-w-[880px]' : ''}`}>
          <colgroup>
            <col />
            <col className="hidden w-56 sm:table-column" />
            {detailed ? <col className="w-32" /> : null}
            <col className={detailed ? 'w-56' : 'w-28'} />
            <col className="w-32" />
          </colgroup>
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-white/60">
              <th className="px-4 py-2 font-medium">Attendee</th>
              <th className="hidden px-4 py-2 font-medium sm:table-cell">Ticket</th>
              {detailed ? <th className="px-4 py-2 font-medium">Status</th> : null}
              <th className="px-4 py-2 font-medium">Arrival</th>
              <th className="px-4 py-2 text-right font-medium">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase) => {
              if (!detailed && isSingleTicket(purchase)) {
                return (
                  <Fragment key={`p${purchase.id}`}>
                    {row(purchase.tickets[0], {
                      name: purchase.purchaser_name,
                      hit: Boolean(purchase.search_match?.includes('buyer')),
                    })}
                  </Fragment>
                );
              }

              const foldable = detailed
                ? []
                : // A ticket just admitted here stays out, so its Undo stays in reach.
                  purchase.tickets.filter((t) => !t.holder_name && !t.search_hit && !undoableIds.has(t.id));
              // Folding a single ticket saves nothing — show it.
              const folded = foldable.length > 1 && !expanded.has(purchase.id) ? foldable : [];
              const shown = purchase.tickets.filter((t) => !folded.includes(t));
              const next = foldable.find((t) => !t.checked_in);
              const foldedArrived = foldable.filter((t) => t.checked_in).length;

              return (
                <Fragment key={`p${purchase.id}`}>
                  <PurchaseHeaderRow purchase={purchase} view={view} columns={columns} />
                  {shown.map((attendee) => row(attendee))}
                  {foldable.length > 1 ? (
                    <tr className="border-t border-slate-100 dark:border-white/10">
                      <td colSpan={columns - 1} className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => toggle(purchase.id)}
                          aria-expanded={folded.length === 0}
                          className="text-sm text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white"
                        >
                          {folded.length ? '▸' : '▾'} {foldable.length} unnamed tickets
                          {foldedArrived ? ` · ${foldedArrived} arrived` : ''}
                          <span className="ml-2 text-xs text-slate-400 dark:text-white/40">
                            {folded.length ? 'Show' : 'Hide'}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {next && folded.length ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={busyTicketId === next.id}
                            onClick={() => onCheckIn(next)}
                            className="h-10 whitespace-normal px-3 text-sm leading-tight"
                            title={`Checks in ${next.ticket_number}`}
                          >
                            Check in next unnamed
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {pageCount > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Previous
          </Button>
          <span className="text-xs text-slate-500 dark:text-white/50">
            Page {page} of {pageCount} · {count} purchases
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
