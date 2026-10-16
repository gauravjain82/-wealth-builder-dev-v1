/** Helpers for Phase 5 SLA display: relative durations and absolute due times. */

import type { HelpdeskSlaFields } from './services/helpdesk-service';

/** Parse an ISO timestamp to ms, or null when missing/invalid. */
export function parseTime(value?: string | null): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/** Compact duration: "35m", "2h", "2h 15m" (under 10h), "3d". Never below "1m". */
export function formatDuration(ms: number): string {
  const minutes = Math.max(1, Math.round(Math.abs(ms) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return hours < 10 && rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
  }
  return `${Math.floor(hours / 24)}d`;
}

/** Locale date+time for tooltips and the detail SLA line. */
export function formatAbsolute(value?: string | null): string {
  const ms = parseTime(value);
  return ms === null ? '' : new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** "First response" / "Resolution" for the active target. */
export function slaTargetLabel(target?: string | null): string {
  return target === 'first_response' ? 'First response' : 'Resolution';
}

/** Active due time: `sla_due_at`, falling back to the target's own due field. */
export function activeDueAt(ticket: HelpdeskSlaFields): string | null {
  if (ticket.sla_due_at) return ticket.sla_due_at;
  if (ticket.sla_target === 'first_response') return ticket.first_response_due_at ?? null;
  if (ticket.sla_target === 'resolution') return ticket.resolution_due_at ?? null;
  return null;
}
