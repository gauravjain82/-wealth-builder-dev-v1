import { Badge, Button } from '@shared/components';
import type { CheckinAttendee } from '../types/checkin';

interface AttendeeTableProps {
  attendees: CheckinAttendee[];
  page: number;
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

/** The door list: one row per live ticket with a check-in / undo control. */
export function AttendeeTable({
  attendees,
  page,
  count,
  pageSize = 25,
  busyTicketId,
  onPageChange,
  onCheckIn,
  onUndo,
}: AttendeeTableProps) {
  const pageCount = Math.max(1, Math.ceil(count / pageSize));

  if (attendees.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
        No attendees match this search.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-white/60">
              <th className="px-3 py-2">Attendee</th>
              <th className="px-3 py-2">Ticket</th>
              <th className="px-3 py-2">Invoice</th>
              <th className="px-3 py-2">Arrived</th>
              <th className="px-3 py-2">By</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {attendees.map((attendee) => (
              <tr
                key={attendee.id}
                className={`border-t border-slate-100 dark:border-white/10 ${
                  attendee.checked_in ? 'bg-emerald-50/60 dark:bg-emerald-500/5' : ''
                }`}
              >
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-900 dark:text-white">
                    {attendee.holder_name || '(unassigned)'}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-white/50">
                    {attendee.holder_email || attendee.holder_phone || '—'}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="text-slate-600 dark:text-white/70">
                    {attendee.ticket_number}
                  </div>
                  {attendee.assignment_status !== 'ASSIGNED' ? (
                    <Badge variant="outline">{attendee.assignment_status}</Badge>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-white/70">
                  {attendee.invoice_number}
                </td>
                <td className="px-3 py-2">
                  {attendee.checked_in ? (
                    <Badge variant="success">{arrivalTime(attendee.checked_in_at)}</Badge>
                  ) : (
                    <span className="text-slate-400 dark:text-white/40">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-slate-500 dark:text-white/50">
                  {attendee.checked_in_by_name || '—'}
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end">
                    {attendee.checked_in ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busyTicketId === attendee.id}
                        onClick={() => onUndo(attendee)}
                      >
                        Undo
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        disabled={busyTicketId === attendee.id}
                        onClick={() => onCheckIn(attendee)}
                      >
                        Check in
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-slate-500 dark:text-white/50">
            Page {page} of {pageCount}
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
