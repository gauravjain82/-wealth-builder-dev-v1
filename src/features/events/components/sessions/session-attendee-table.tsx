import { Badge, Button } from '@shared/components';
import type { SessionAttendee, SessionCheckinMethod } from '../../types/session';

interface SessionAttendeeTableProps {
  attendees: SessionAttendee[];
  count: number;
  page: number;
  pageSize?: number;
  busyTicketId: number | null;
  restricted: boolean;
  onPageChange: (page: number) => void;
  onCheckIn: (attendee: SessionAttendee) => void;
  onUndo: (attendee: SessionAttendee) => void;
}

const METHOD_LABEL: Record<SessionCheckinMethod, string> = {
  STAFF_SCAN: 'Scanned',
  SELF_SCAN: 'Self-scan',
  MANUAL: 'From list',
};

function time(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** A session's door list: who is expected, who is in, and how they got in. */
export function SessionAttendeeTable({
  attendees,
  count,
  page,
  pageSize = 25,
  busyTicketId,
  restricted,
  onPageChange,
  onCheckIn,
  onUndo,
}: SessionAttendeeTableProps) {
  const pageCount = Math.max(1, Math.ceil(count / pageSize));

  if (!attendees.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
        {restricted
          ? 'Nobody eligible matches. Add people to this session’s allow-list in Builder → Sessions.'
          : 'No attendees match.'}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
        <table className="w-full text-sm">
          <caption className="sr-only">Session attendees</caption>
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-white/50">
            <tr>
              <th scope="col" className="px-3 py-2">Attendee</th>
              <th scope="col" className="px-3 py-2">Ticket</th>
              <th scope="col" className="px-3 py-2">Event</th>
              <th scope="col" className="px-3 py-2">Session</th>
              <th scope="col" className="px-3 py-2"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {attendees.map((a) => (
              <tr
                key={a.id}
                className={`border-t border-slate-100 dark:border-white/10 ${
                  a.checked_in ? 'bg-emerald-50/60 dark:bg-emerald-500/5' : ''
                }`}
              >
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-900 dark:text-white">{a.holder_name || '(unassigned)'}</div>
                  <div className="text-xs text-slate-500 dark:text-white/50">
                    {[a.holder_email || a.holder_phone, a.seller_name].filter(Boolean).join(' · ') || '—'}
                  </div>
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-white/70">{a.ticket_number}</td>
                <td className="px-3 py-2">
                  {a.event_checked_in ? (
                    <Badge variant="secondary">Registered</Badge>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-white/40">Not yet</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {a.checked_in ? (
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant="success">{time(a.checked_in_at)}</Badge>
                      {a.method ? (
                        <span className="text-xs text-slate-500 dark:text-white/50">{METHOD_LABEL[a.method]}</span>
                      ) : null}
                      {a.override ? <Badge variant="warning">Override</Badge> : null}
                    </div>
                  ) : (
                    <span className="text-slate-400 dark:text-white/40">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end">
                    {a.checked_in ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busyTicketId === a.id}
                        onClick={() => onUndo(a)}
                        aria-label={`Undo check-in for ${a.holder_name || a.ticket_number}`}
                      >
                        Undo
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        disabled={busyTicketId === a.id}
                        onClick={() => onCheckIn(a)}
                        aria-label={`Check in ${a.holder_name || a.ticket_number}`}
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
          <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
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
