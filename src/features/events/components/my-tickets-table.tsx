import { Badge, Button } from '@shared/components';
import type { EventTicket } from '../types/ticket';

interface MyTicketsTableProps {
  tickets: EventTicket[];
  onAssign: (ticket: EventTicket) => void;
  onTransfer: (ticket: EventTicket) => void;
  onPdf: (ticket: EventTicket) => void;
}

function holderLabel(ticket: EventTicket): string {
  const name = `${ticket.holder_first_name} ${ticket.holder_last_name}`.trim();
  return name || ticket.holder_email || '—';
}

/** Tickets the current user owns — the bulk-buy / transfer-to-team table. */
export function MyTicketsTable({ tickets, onAssign, onTransfer, onPdf }: MyTicketsTableProps) {
  if (tickets.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
        You don&apos;t own any tickets for this event yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-white/60">
            <th className="px-3 py-2">Ticket</th>
            <th className="px-3 py-2">Assignment</th>
            <th className="px-3 py-2">Holder</th>
            <th className="px-3 py-2">Lifecycle</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="border-t border-slate-100 dark:border-white/10">
              <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                {ticket.ticket_number}
              </td>
              <td className="px-3 py-2">
                <Badge variant="outline">{ticket.assignment_status}</Badge>
              </td>
              <td className="px-3 py-2 text-slate-600 dark:text-white/70">{holderLabel(ticket)}</td>
              <td className="px-3 py-2 text-slate-600 dark:text-white/70">
                {ticket.lifecycle_status}
              </td>
              <td className="px-3 py-2">
                <div className="flex justify-end gap-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => onAssign(ticket)}>
                    Assign
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onTransfer(ticket)}
                    disabled={ticket.lifecycle_status !== 'ACTIVE'}
                  >
                    Transfer
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => onPdf(ticket)}>
                    PDF
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
