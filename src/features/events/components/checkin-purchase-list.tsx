import { Badge, Button } from '@shared/components';
import type { CheckinAttendee, CheckinPurchase } from '../types/checkin';
import { credentialLabel } from '../types/door';
import { TICKET_STATUS_LABEL, TICKET_STATUS_TONE } from '../utils/ticket-status';
import { TicketCountPills } from './ticket-count-pills';
import { SearchMatchLabel } from './search-match-label';
import { SEARCH_HIT_CLASS } from '../utils/purchase-search';

interface CheckinPurchaseListProps {
  purchases: CheckinPurchase[];
  page: number;
  /** Total purchases matching the filters (all pages). */
  count: number;
  pageSize?: number;
  busyTicketId: number | null;
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

/** The purchase's heading: our number, buyer, partner references and SMD. */
function PurchaseHeader({ purchase }: { purchase: CheckinPurchase }) {
  const partner = purchase.channel && purchase.channel !== 'WB';
  return (
    <div className="space-y-2 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1">
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{purchase.invoice_number}</div>
          <div className="text-sm text-slate-600 dark:text-white/70">
            Bought by{' '}
            <span className={purchase.search_match?.includes('buyer') ? SEARCH_HIT_CLASS : undefined}>
              {purchase.purchaser_name || '—'}
            </span>
            {purchase.purchaser_email && purchase.purchaser_email !== purchase.purchaser_name
              ? ` · ${purchase.purchaser_email}`
              : ''}
          </div>
          {partner ? (
            <div className="text-xs text-slate-500 dark:text-white/50">
              {purchase.channel} {purchase.external_order_reference}
              {purchase.external_invoice_reference ? ` · Inv ${purchase.external_invoice_reference}` : ''}
            </div>
          ) : null}
          <SearchMatchLabel matches={purchase.search_match} />
        </div>
        <div className="text-sm text-slate-600 dark:text-white/70">
          <span className="text-slate-500 dark:text-white/50">SMD </span>
          {purchase.seller_name || '—'}
        </div>
      </div>
      <TicketCountPills
        total={purchase.ticket_count}
        assigned={purchase.assigned_count}
        unassigned={purchase.unassigned_count}
        transferred={purchase.transferred_count}
        arrived={purchase.arrived_count}
      />
    </div>
  );
}

/** One ticket of a purchase: who attends, the ticket, its status and arrival. */
function TicketRow({
  attendee,
  busy,
  onCheckIn,
  onUndo,
}: {
  attendee: CheckinAttendee;
  busy: boolean;
  onCheckIn: (attendee: CheckinAttendee) => void;
  onUndo: (attendee: CheckinAttendee) => void;
}) {
  const status = attendee.shown_status ?? attendee.assignment_status;
  return (
    <tr
      className={`border-t border-slate-100 first:border-t-0 dark:border-white/10 ${
        attendee.search_hit
          ? 'bg-amber-50 dark:bg-amber-400/10'
          : attendee.checked_in
            ? 'bg-emerald-50/60 dark:bg-emerald-500/5'
            : ''
      }`}
    >
      <td
        className={`px-4 py-2 ${attendee.search_hit ? 'border-l-4 border-amber-400' : ''}`}
        title={attendee.search_hit ? 'Matches your search' : undefined}
      >
        <div className="flex flex-wrap items-center gap-1.5 font-medium text-slate-900 dark:text-white">
          {attendee.holder_name || (
            <span className="font-normal italic text-slate-500 dark:text-white/50">No attendee named</span>
          )}
          {attendee.holder_linked ? (
            <Badge variant="outline" title="Ticket is linked to a platform account">
              Linked
            </Badge>
          ) : null}
        </div>
        {attendee.holder_email || attendee.holder_phone ? (
          <div className="text-xs text-slate-500 dark:text-white/50">
            {attendee.holder_email || attendee.holder_phone}
          </div>
        ) : null}
      </td>
      <td className="px-4 py-2">
        <div className="text-slate-600 dark:text-white/70">{attendee.ticket_number}</div>
        {attendee.source === 'BSCPRO' && attendee.external_reference ? (
          <div className="text-xs text-slate-500 dark:text-white/50">BSCPro {attendee.external_reference}</div>
        ) : null}
      </td>
      <td className="px-4 py-2">
        <Badge variant={TICKET_STATUS_TONE[status]}>{TICKET_STATUS_LABEL[status]}</Badge>
      </td>
      <td className="px-4 py-2">
        {attendee.checked_in ? (
          <div className="flex flex-wrap items-center gap-1">
            <Badge variant="success">{arrivalTime(attendee.checked_in_at)}</Badge>
            {attendee.checkin_source === 'SESSION' ? (
              <Badge variant="info" title="Skipped registration — checked in by a session scan">
                via {attendee.checkin_via_session || 'session'}
              </Badge>
            ) : null}
            {credentialLabel(attendee.checkin_credential) ? (
              <Badge variant="outline" title="What was scanned at arrival">
                {credentialLabel(attendee.checkin_credential)}
              </Badge>
            ) : null}
            {attendee.checked_in_by_name ? (
              <span className="text-xs text-slate-500 dark:text-white/50">by {attendee.checked_in_by_name}</span>
            ) : null}
          </div>
        ) : (
          <span className="text-slate-400 dark:text-white/40">Not arrived</span>
        )}
      </td>
      <td className="px-4 py-2">
        <div className="flex justify-end">
          {attendee.checked_in ? (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onUndo(attendee)}>
              Undo
            </Button>
          ) : (
            <Button type="button" size="sm" disabled={busy} onClick={() => onCheckIn(attendee)}>
              Check in
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

/**
 * The door list grouped by purchase, like the Purchases page: one block per
 * purchase (number, buyer, SMD, highlighted counts) with its tickets beneath,
 * named attendees first, each with its own Check in / Undo. With a search, the
 * block says what matched and the ticket it named is highlighted.
 */
export function CheckinPurchaseList({
  purchases,
  page,
  count,
  pageSize = 25,
  busyTicketId,
  onPageChange,
  onCheckIn,
  onUndo,
}: CheckinPurchaseListProps) {
  const pageCount = Math.max(1, Math.ceil(count / pageSize));

  if (purchases.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
        No purchases match this search.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {purchases.map((purchase) => (
        <section
          key={purchase.id}
          className="overflow-hidden rounded-lg border border-slate-200 dark:border-white/10"
        >
          <PurchaseHeader purchase={purchase} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead className="sr-only">
                <tr>
                  <th>Attendee</th>
                  <th>Ticket</th>
                  <th>Status</th>
                  <th>Arrived</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {purchase.tickets.map((attendee) => (
                  <TicketRow
                    key={attendee.id}
                    attendee={attendee}
                    busy={busyTicketId === attendee.id}
                    onCheckIn={onCheckIn}
                    onUndo={onUndo}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
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
