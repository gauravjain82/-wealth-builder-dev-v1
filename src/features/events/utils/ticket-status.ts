/**
 * One vocabulary for ticket status across Purchases, the order pop-up and Check-in:
 * **Assigned** (someone is named), **Not assigned** (nobody named yet — for an
 * imported ticket, the partner's export named nobody) and **Transferred** (the
 * ticket changed hands, on WB or at the partner). The server decides which one a
 * ticket shows (`shown_status`); older payloads fall back to `assignment_status`.
 */

import type { AssignmentStatus, EventTicket } from '../types/ticket';
import type { OrderStatus } from '../types/order';

export type StatusTone = 'success' | 'warning' | 'info' | 'outline' | 'secondary';

export const TICKET_STATUS_LABEL: Record<AssignmentStatus, string> = {
  ASSIGNED: 'Assigned',
  UNASSIGNED: 'Not assigned',
  TRANSFERRED: 'Transferred',
};

export const TICKET_STATUS_TONE: Record<AssignmentStatus, StatusTone> = {
  ASSIGNED: 'success',
  UNASSIGNED: 'warning',
  TRANSFERRED: 'info',
};

/** The status a ticket shows. */
export function shownStatus(ticket: Pick<EventTicket, 'assignment_status' | 'shown_status'>): AssignmentStatus {
  return ticket.shown_status ?? ticket.assignment_status;
}

/** A ticket issued by an outside partner (BSCPro) rather than sold through WB. */
export function isPartnerTicket(ticket: Pick<EventTicket, 'source'>): boolean {
  return Boolean(ticket.source) && ticket.source !== 'NATIVE';
}

/** Payment status words for WB orders; an imported order shows its channel instead. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  REFUNDED: 'Refunded',
  CANCELLED: 'Cancelled',
  COMP: 'Comp',
  EXTERNAL: 'Sold by partner',
};

/** "2 assigned · 1 not assigned · 1 transferred", leaving out zero counts. */
export function statusCounts(assigned: number, unassigned: number, transferred: number): string {
  const parts = [
    assigned ? `${assigned} assigned` : '',
    unassigned ? `${unassigned} not assigned` : '',
    transferred ? `${transferred} transferred` : '',
  ].filter(Boolean);
  return parts.join(' · ') || 'No tickets';
}
