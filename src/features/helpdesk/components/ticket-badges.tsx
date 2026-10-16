/** Small pills for ticket status, source, tier, worker-facing queue state and SLA. */

import {
  HELPDESK_QUEUE_STATE_LABELS,
  HELPDESK_SOURCE_LABELS,
  HELPDESK_STATUS_LABELS,
  HELPDESK_TIER_DESCRIPTIONS,
  HELPDESK_TIER_LABELS,
} from '../constants';
import { useMinuteTick } from '../hooks/use-minute-tick';
import { isAttentionState } from '../queue-state';
import type { HelpdeskSlaFields } from '../services/helpdesk-service';
import { activeDueAt, formatAbsolute, formatDuration, parseTime, slaTargetLabel } from '../sla';

const AMBER = 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100';
const GREY = 'border-slate-300 bg-slate-100 text-slate-700 dark:border-white/20 dark:bg-white/10 dark:text-white/70';
const BLUE = 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-400/30 dark:bg-sky-500/15 dark:text-sky-100';
const NEUTRAL = 'border-slate-200 bg-white text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-white/80';
const MUTED = 'border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/45';

const STATUS_STYLES: Record<string, string> = {
  open: BLUE,
  in_progress: AMBER,
  waiting_on_user: GREY,
  resolved: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-100',
  closed: GREY,
};

const PILL = 'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold';

interface TicketStatusBadgeProps {
  status: string;
  /** `requester` words `waiting_on_user` as "Waiting on you" (amber) for the submitter. */
  audience?: 'staff' | 'requester';
}

/** Coloured pill for a ticket status. */
export function TicketStatusBadge({ status, audience = 'staff' }: TicketStatusBadgeProps) {
  if (audience === 'requester' && status === 'waiting_on_user') {
    return <span className={`${PILL} ${AMBER}`}>Waiting on you</span>;
  }
  return (
    <span className={`${PILL} ${STATUS_STYLES[status] ?? STATUS_STYLES.closed}`}>
      {HELPDESK_STATUS_LABELS[status] ?? status}
    </span>
  );
}

/** Neutral pill naming where a ticket came from (report button, public form, Telegram). */
export function TicketSourceBadge({ source }: { source?: string | null }) {
  if (!source) return null;
  return (
    <span className={`${PILL} border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-400/30 dark:bg-violet-500/15 dark:text-violet-100`}>
      {HELPDESK_SOURCE_LABELS[source] ?? source}
    </span>
  );
}

const TIER_STYLES: Record<string, string> = {
  l1: 'border-teal-300 bg-teal-50 text-teal-800 dark:border-teal-400/30 dark:bg-teal-500/15 dark:text-teal-100',
  l2: 'border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-400/30 dark:bg-indigo-500/15 dark:text-indigo-100',
  l3: 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-100',
};

/** Pill for the support tier (L1 / L2 / L3) with a "who works it" tooltip. */
export function TicketTierBadge({ tier }: { tier?: string | null }) {
  if (!tier) return null;
  const description = HELPDESK_TIER_DESCRIPTIONS[tier] ?? tier;
  return (
    <span className={`${PILL} ${TIER_STYLES[tier] ?? NEUTRAL}`} title={description} aria-label={description}>
      {HELPDESK_TIER_LABELS[tier] ?? tier}
    </span>
  );
}

const QUEUE_STATE_STYLES: Record<string, string> = {
  new: BLUE,
  user_replied: BLUE,
  received: AMBER,
  waiting_on_user: GREY,
  in_progress: NEUTRAL,
  resolved: MUTED,
  closed: MUTED,
};

/**
 * Worker-facing state pill. `new` / `user_replied` get a blue dot; every state
 * carries a text label so colour is never the only signal.
 */
export function QueueStateBadge({ state }: { state?: string | null }) {
  if (!state) return null;
  const attention = isAttentionState(state);
  return (
    <span className={`${PILL} gap-1 ${QUEUE_STATE_STYLES[state] ?? NEUTRAL}`}>
      {attention ? <span aria-hidden="true" className="h-2 w-2 rounded-full bg-sky-500" /> : null}
      {HELPDESK_QUEUE_STATE_LABELS[state] ?? state}
    </span>
  );
}

const ORANGE = 'border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-400/40 dark:bg-orange-500/15 dark:text-orange-100';
const RED = 'border-red-300 bg-red-50 text-red-800 dark:border-red-400/40 dark:bg-red-500/20 dark:text-red-100';

interface SlaBadgeProps {
  ticket: HelpdeskSlaFields;
  /** `row` hides the "ok" state to keep lists quiet; `detail` shows "Due in …". */
  variant?: 'row' | 'detail';
}

/**
 * SLA pill: "2h left" (due soon), "Overdue 1h" (breached), "Paused" (waiting on user),
 * "Due in 5h" (ok, detail only). Text always carries the meaning; the tooltip names the
 * target and absolute due time. Relative time refreshes via the shared minute tick.
 */
export function SlaBadge({ ticket, variant = 'row' }: SlaBadgeProps) {
  const now = useMinuteTick();
  const state = ticket.sla_state;
  if (!state || state === 'none') return null;
  if (state === 'paused') {
    return (
      <span className={`${PILL} ${GREY}`} title="SLA paused while waiting on the user">
        Paused
      </span>
    );
  }
  if (state === 'ok' && variant === 'row') return null;

  const dueAt = activeDueAt(ticket);
  const dueMs = parseTime(dueAt);
  const target = slaTargetLabel(ticket.sla_target);
  const title = dueAt ? `${target} due ${formatAbsolute(dueAt)}` : `${target} SLA`;
  const remaining = dueMs === null ? null : dueMs - now;

  if (state === 'breached') {
    const overdue = remaining !== null && remaining < 0 ? ` ${formatDuration(remaining)}` : '';
    return (
      <span className={`${PILL} gap-1 ${RED}`} title={title} aria-label={`Overdue${overdue}. ${title}`}>
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-red-500" />
        Overdue{overdue}
      </span>
    );
  }
  if (state === 'due_soon') {
    // The server may still say due_soon for a minute past the due time; read it as overdue.
    const text =
      remaining === null ? 'Due soon' : remaining > 0 ? `${formatDuration(remaining)} left` : `Overdue ${formatDuration(remaining)}`;
    return (
      <span className={`${PILL} ${remaining !== null && remaining <= 0 ? RED : ORANGE}`} title={title} aria-label={`${text}. ${title}`}>
        {text}
      </span>
    );
  }
  if (state === 'ok') {
    const text = remaining !== null && remaining > 0 ? `Due in ${formatDuration(remaining)}` : 'On track';
    return (
      <span className={`${PILL} ${MUTED}`} title={title} aria-label={`${text}. ${title}`}>
        {text}
      </span>
    );
  }
  return null;
}

/**
 * Compact SLA summary for the detail header: first-response (met / missed / due) and
 * resolution due time. Renders nothing when the backend sends no SLA fields.
 */
export function SlaSummary({
  ticket,
  firstResponseAt,
  className = '',
}: {
  ticket: HelpdeskSlaFields;
  firstResponseAt?: string | null;
  className?: string;
}) {
  const frDue = ticket.first_response_due_at;
  const resDue = ticket.resolution_due_at;
  if (!frDue && !resDue) return null;

  let firstResponseOutcome = '';
  const frDueMs = parseTime(frDue);
  const frAtMs = parseTime(firstResponseAt);
  if (frAtMs !== null) {
    firstResponseOutcome = frDueMs !== null && frAtMs > frDueMs ? ` (missed, replied ${formatAbsolute(firstResponseAt)})` : ` (met ${formatAbsolute(firstResponseAt)})`;
  } else if (frDueMs !== null && ticket.sla_target === 'first_response' && ticket.sla_state === 'breached') {
    firstResponseOutcome = ' (missed)';
  }

  return (
    <dl aria-label="SLA" className={`flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-600 dark:text-white/65 ${className}`}>
      {frDue ? (
        <div className="flex gap-1">
          <dt className="font-semibold">First response:</dt>
          <dd>
            due {formatAbsolute(frDue)}
            {firstResponseOutcome}
          </dd>
        </div>
      ) : null}
      {resDue ? (
        <div className="flex gap-1">
          <dt className="font-semibold">Resolution:</dt>
          <dd>due {formatAbsolute(resDue)}</dd>
        </div>
      ) : null}
    </dl>
  );
}
