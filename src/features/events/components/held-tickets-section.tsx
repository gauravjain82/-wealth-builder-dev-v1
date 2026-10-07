import { Badge, Button, Card, CardContent, Text } from '@shared/components';
import type { HeldTicket } from '../types/ticket';

interface HeldTicketsSectionProps {
  tickets: HeldTicket[];
  onHandOver: (ticket: HeldTicket) => void;
}

function holderName(ticket: HeldTicket): string {
  return `${ticket.holder_first_name} ${ticket.holder_last_name}`.trim() || ticket.holder_email || '—';
}

/**
 * "Tickets in your name" — tickets the user is the named attendee of, whoever
 * owns them (including BSCPro imports, which have no owner here). The holder
 * can transfer one to someone else; when that isn't allowed the button says why.
 */
export function HeldTicketsSection({ tickets, onHandOver }: HeldTicketsSectionProps) {
  if (tickets.length === 0) return null;
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="font-semibold text-slate-900 dark:text-white">Tickets in your name</p>
          <Text variant="muted" className="text-xs">
            Can’t make it? Hand your ticket over — the confirmation stays the same and the new
            attendee is emailed their ticket.
          </Text>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-white/10">
          {tickets.map((ticket) => (
            <li key={ticket.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{holderName(ticket)}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-white/60">
                  <span>{ticket.ticket_number}</span>
                  {ticket.source === 'BSCPRO' ? (
                    <Badge variant="outline">
                      BSCPro{ticket.external_reference ? ` · ${ticket.external_reference}` : ''}
                    </Badge>
                  ) : null}
                  {ticket.is_checked_in ? <Badge variant="success">Checked in</Badge> : null}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!ticket.can_hand_over}
                  title={ticket.can_hand_over ? undefined : ticket.hand_over_blocked_reason}
                  onClick={() => onHandOver(ticket)}
                >
                  Transfer this ticket
                </Button>
                {!ticket.can_hand_over && ticket.hand_over_blocked_reason ? (
                  <span className="max-w-[260px] text-right text-xs text-slate-500 dark:text-white/50">
                    {ticket.hand_over_blocked_reason}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
