import { Fragment, useState } from 'react';
import { Badge, Button } from '@shared/components';
import type { CheckinAttendee, CheckinPurchase } from '../types/checkin';
import { credentialLabel } from '../types/door';
import { TICKET_STATUS_LABEL } from '../utils/ticket-status';
import { SearchMatchLabel } from './search-match-label';
import { SEARCH_HIT_CLASS } from '../utils/purchase-search';

/**
 * `door` — what a person at the entrance needs: the attendee, the ticket's
 * numbers (internal, external, invoice), who bought it, Assign and one big
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
  /** The viewer may name attendees (purchase managers) — offers Assign on unnamed tickets. */
  canAssign: boolean;
  onAssign: (attendee: CheckinAttendee, purchase: CheckinPurchase) => void;
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

/**
 * Door view: the numbers an attendee may quote — our ticket number, the
 * partner's confirmation, and the invoice from their purchase email (the
 * partner's when imported, else ours).
 */
function ticketIds(attendee: CheckinAttendee, purchase: CheckinPurchase): Array<[string, string]> {
  const partner = purchase.channel && purchase.channel !== 'WB';
  const ids: Array<[string, string]> = [
    ['Internal ID', attendee.ticket_number],
    ['External ID', attendee.external_reference || (partner ? purchase.external_order_reference : '')],
    ['Invoice ID', purchase.external_invoice_reference || purchase.invoice_number],
  ];
  return ids.filter(([, value]) => Boolean(value));
}

/** Door view: the buyer's name, email and mobile — one line each. */
function PurchaserCell({ purchase, hit }: { purchase: CheckinPurchase; hit: boolean }) {
  return (
    <td className="hidden px-4 py-2.5 md:table-cell">
      <div className={`font-medium text-slate-900 dark:text-white ${hit ? SEARCH_HIT_CLASS : ''}`}>
        {purchase.purchaser_name || '—'}
      </div>
      {purchase.purchaser_email ? (
        <div className="break-all text-xs text-slate-500 dark:text-white/50">{purchase.purchaser_email}</div>
      ) : null}
      {purchase.purchaser_phone ? (
        <div className="text-xs text-slate-500 dark:text-white/50">{purchase.purchaser_phone}</div>
      ) : null}
    </td>
  );
}

function AssignButton({ disabled, onClick, title }: { disabled: boolean; onClick: () => void; title?: string }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className="h-10 px-3 text-sm"
    >
      Assign
    </Button>
  );
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
  purchase,
  view,
  first,
  busy,
  canUndo,
  canAssign,
  onCheckIn,
  onUndo,
  onAssign,
}: {
  attendee: CheckinAttendee;
  purchase: CheckinPurchase;
  view: CheckinListView;
  /** Door view: the purchase's first row, which carries the group divider. */
  first: boolean;
  busy: boolean;
  canUndo: boolean;
  canAssign: boolean;
  onCheckIn: (attendee: CheckinAttendee) => void;
  onUndo: (attendee: CheckinAttendee) => void;
  onAssign: (attendee: CheckinAttendee, purchase: CheckinPurchase) => void;
}) {
  const status = attendee.shown_status ?? attendee.assignment_status;
  const detailed = view === 'detailed';
  const details = arrivalDetails(attendee);
  const contact = attendee.holder_email || attendee.holder_phone;
  const buyerHit = Boolean(purchase.search_match?.includes('buyer'));
  const assignable = canAssign && !attendee.holder_name;

  if (!detailed) {
    return (
      <tr
        className={`align-top ${
          first ? 'border-t-2 border-slate-200 dark:border-white/15' : 'border-t border-slate-100 dark:border-white/10'
        } ${
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
          <div className="font-medium text-slate-900 dark:text-white">
            {attendee.holder_name || (
              <span className="font-normal italic text-slate-500 dark:text-white/50">Unnamed ticket</span>
            )}
          </div>
          {contact ? <div className="break-all text-xs text-slate-500 dark:text-white/50">{contact}</div> : null}
          {/* Narrow screens: the ticket and purchaser columns are hidden, so their essentials ride here. */}
          <div className="text-xs text-slate-500 sm:hidden dark:text-white/50">{attendee.ticket_number}</div>
          {purchase.purchaser_name ? (
            <div className="text-xs text-slate-500 md:hidden dark:text-white/50">
              Bought by <span className={buyerHit ? SEARCH_HIT_CLASS : undefined}>{purchase.purchaser_name}</span>
            </div>
          ) : null}
        </td>
        <td className="hidden px-4 py-2.5 sm:table-cell">
          <dl className="grid grid-cols-[auto_1fr] gap-x-2 text-xs">
            {ticketIds(attendee, purchase).map(([label, value]) => (
              <Fragment key={label}>
                <dt className="text-slate-400 dark:text-white/40">{label}</dt>
                <dd className="break-all text-slate-700 dark:text-white/80">{value}</dd>
              </Fragment>
            ))}
          </dl>
        </td>
        <PurchaserCell purchase={purchase} hit={buyerHit} />
        <td className="px-4 py-2.5" title={details || undefined}>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {assignable ? (
              <AssignButton disabled={busy} onClick={() => onAssign(attendee, purchase)} />
            ) : null}
            {attendee.checked_in ? (
              <>
                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                  ✓ {arrivalTime(attendee.checked_in_at)}
                </span>
                {canUndo ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onUndo(attendee)}
                    className="text-sm text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline disabled:opacity-50 dark:text-white/60 dark:hover:text-white"
                  >
                    Undo
                  </button>
                ) : null}
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => onCheckIn(attendee)}
                className="h-10 px-4 text-sm"
              >
                Check in
              </Button>
            )}
          </div>
        </td>
      </tr>
    );
  }

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
          {attendee.holder_linked ? (
            <Badge variant="outline" title="Ticket is linked to a platform account">
              Linked
            </Badge>
          ) : null}
        </div>
        {contact ? <div className="text-xs text-slate-500 dark:text-white/50">{contact}</div> : null}
        {/* Phones: the ticket column is hidden, so its number rides under the name. */}
        <div className="text-xs text-slate-500 sm:hidden dark:text-white/50">{attendee.ticket_number}</div>
      </td>
      <td className="hidden px-4 py-2.5 sm:table-cell">
        <div className="text-slate-700 dark:text-white/80">{attendee.ticket_number}</div>
        {attendee.source === 'BSCPRO' && attendee.external_reference ? (
          <div className="text-xs text-slate-500 dark:text-white/50">BSCPro {attendee.external_reference}</div>
        ) : null}
      </td>
      <td className="px-4 py-2.5">
        {status === 'ASSIGNED' ? (
          <span className="text-slate-500 dark:text-white/60">{TICKET_STATUS_LABEL[status]}</span>
        ) : (
          <Badge variant={status === 'UNASSIGNED' ? 'warning' : 'info'}>{TICKET_STATUS_LABEL[status]}</Badge>
        )}
      </td>
      <td className="px-4 py-2.5">
        {attendee.checked_in ? (
          <>
            <div className="font-medium text-emerald-700 dark:text-emerald-400">
              ✓ {arrivalTime(attendee.checked_in_at)}
            </div>
            {details ? <div className="text-xs text-slate-500 dark:text-white/50">{details}</div> : null}
          </>
        ) : (
          <span className="text-slate-400 dark:text-white/40">Not arrived</span>
        )}
      </td>
      <td className="space-y-1.5 px-4 py-2.5 text-right">
        {assignable ? (
          <div>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onAssign(attendee, purchase)}>
              Assign
            </Button>
          </div>
        ) : null}
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
          <Button type="button" size="sm" disabled={busy} onClick={() => onCheckIn(attendee)}>
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
 * Door view: each ticket row carries its numbers and, once per purchase, the
 * buyer's name, email and mobile. A purchase's unnamed tickets (unless the
 * search named one) fold into a single row with "Assign" and "Check in next
 * unnamed" — a block of fifteen tickets with fourteen unnamed is one named row
 * and one fold, not fifteen rows. Detailed view keeps a heading row per purchase.
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
  canAssign,
  onAssign,
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

  const row = (attendee: CheckinAttendee, purchase: CheckinPurchase, first: boolean) => (
    <TicketRow
      key={attendee.id}
      attendee={attendee}
      purchase={purchase}
      view={view}
      first={first}
      busy={busyTicketId === attendee.id}
      canUndo={detailed || undoableIds.has(attendee.id)}
      canAssign={canAssign}
      onCheckIn={onCheckIn}
      onUndo={onUndo}
      onAssign={onAssign}
    />
  );

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
        <table className={`w-full table-fixed border-collapse text-sm ${detailed ? 'min-w-[880px]' : ''}`}>
          {detailed ? (
            <colgroup>
              <col />
              <col className="hidden w-56 sm:table-column" />
              <col className="w-32" />
              <col className="w-56" />
              <col className="w-32" />
            </colgroup>
          ) : (
            <colgroup>
              <col />
              <col className="hidden w-64 sm:table-column" />
              <col className="hidden w-64 md:table-column" />
              <col className="w-52" />
            </colgroup>
          )}
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-white/60">
              <th className="px-4 py-2 font-medium">Attendee</th>
              <th className="hidden px-4 py-2 font-medium sm:table-cell">{detailed ? 'Ticket' : 'Ticket details'}</th>
              {detailed ? (
                <>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Arrival</th>
                </>
              ) : (
                <th className="hidden px-4 py-2 font-medium md:table-cell">Purchaser</th>
              )}
              <th className="px-4 py-2 text-right font-medium">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase) => {
              const foldable = detailed
                ? []
                : // A ticket just admitted here stays out, so its Undo stays in reach.
                  purchase.tickets.filter((t) => !t.holder_name && !t.search_hit && !undoableIds.has(t.id));
              // Folding a single ticket saves nothing — show it.
              const folded = foldable.length > 1 && !expanded.has(purchase.id) ? foldable : [];
              const shown = purchase.tickets.filter((t) => !folded.includes(t));
              const next = foldable.find((t) => !t.checked_in);
              // Assign the unnamed ticket that has already arrived first — that person is standing here.
              const nextToName = foldable.find((t) => t.checked_in) ?? foldable[0];
              const foldedArrived = foldable.filter((t) => t.checked_in).length;
              const foldRowFirst = shown.length === 0;

              return (
                <Fragment key={`p${purchase.id}`}>
                  {detailed ? <PurchaseHeaderRow purchase={purchase} view={view} columns={columns} /> : null}
                  {shown.map((attendee, index) => row(attendee, purchase, index === 0))}
                  {foldable.length > 1 ? (
                    <tr
                      className={
                        foldRowFirst
                          ? 'border-t-2 border-slate-200 dark:border-white/15'
                          : 'border-t border-slate-100 dark:border-white/10'
                      }
                    >
                      <td colSpan={2} className="px-4 py-2.5">
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
                        {foldRowFirst && purchase.purchaser_name ? (
                          <div className="text-xs text-slate-500 md:hidden dark:text-white/50">
                            Bought by {purchase.purchaser_name}
                          </div>
                        ) : null}
                      </td>
                      {foldRowFirst ? (
                        <PurchaserCell purchase={purchase} hit={Boolean(purchase.search_match?.includes('buyer'))} />
                      ) : (
                        <td className="hidden md:table-cell" />
                      )}
                      <td className="px-4 py-2.5">
                        {folded.length ? (
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {canAssign && nextToName ? (
                              <AssignButton
                                disabled={busyTicketId === nextToName.id}
                                onClick={() => onAssign(nextToName, purchase)}
                                title={`Names the attendee on ${nextToName.ticket_number}`}
                              />
                            ) : null}
                            {next ? (
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
                          </div>
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
