import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Input, Text } from '@shared/components';
import { checkinService } from '../../services/checkin-service';
import { useAccountLink } from '../../hooks/use-account-link';
import { DoorCandidateList } from './door-candidate-list';
import { DoorIdCheckPrompt } from './door-id-check-prompt';
import {
  credentialLabel,
  sourceLabel,
  type DoorCandidate,
  type DoorErrorBody,
  type LinkAccountResult,
} from '../../types/door';
import type { CheckinAttendee } from '../../types/checkin';

interface DoorRefusalPanelProps {
  eventId: number;
  /** Set on a session door: a link admits into this session. */
  sessionId?: number | null;
  message: string;
  /** The structured refusal, when the server sent one. */
  door: DoorErrorBody | null;
  /** True while the parent is re-submitting a picked candidate. */
  busy: boolean;
  /** `ambiguous`: staff picked which ticket the scan meant — re-POST it. */
  onPickCandidate: (candidate: DoorCandidate) => void;
  /** A profile QR was linked to a ticket and the holder admitted. */
  onLinked: (result: LinkAccountResult) => void;
  onDismiss: () => void;
  /** Extra buttons next to Dismiss (the session door's "Admit anyway"). */
  actions?: ReactNode;
  dismissLabel?: string;
}

/**
 * What the door shows when a scan is refused. Beyond the message, each
 * structured refusal gets its next step:
 *
 * - `ambiguous` — the tickets the scan could mean; pick one to admit.
 * - `no_linked_ticket` — a profile QR whose account has no ticket linked yet:
 *   the account (contact details masked), candidate tickets to "Link & admit",
 *   and a search of the door list when there are none.
 * - `on_hold` — the hold reason, and where to resolve it.
 *
 * Linking whose contact details don't match pauses for an explicit photo-ID
 * confirmation (`DoorIdCheckPrompt`).
 */
export function DoorRefusalPanel({
  eventId,
  sessionId,
  message,
  door,
  busy,
  onPickCandidate,
  onLinked,
  onDismiss,
  actions,
  dismissLabel = 'Dismiss',
}: DoorRefusalPanelProps) {
  const link = useAccountLink(eventId, sessionId);
  const working = busy || link.busy;
  const candidates = door?.candidates ?? [];
  const account = door?.account ?? null;
  const recognised = credentialLabel(door?.credential);

  const linkTo = async (ticketId: number) => {
    if (!account) return;
    const result = await link.link({ ticket_id: ticketId, user_id: account.id });
    if (result) onLinked(result);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <Text className="text-sm font-medium text-red-800 dark:text-red-200">{message}</Text>
          {recognised ? (
            <Text variant="muted" className="text-xs">
              Scanned: {recognised}
            </Text>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {actions}
          <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
            {dismissLabel}
          </Button>
        </div>
      </div>

      {door?.code === 'ambiguous' && candidates.length > 0 ? (
        <div className="space-y-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-white/70">
            Which ticket is it?
          </Text>
          <DoorCandidateList
            candidates={candidates}
            actionLabel="Admit"
            busy={working}
            onPick={onPickCandidate}
          />
        </div>
      ) : null}

      {door?.code === 'no_linked_ticket' && account ? (
        <div className="space-y-2">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{account.name}</p>
            <p className="text-xs text-slate-500 dark:text-white/60">
              {[account.agency_code, account.email_masked, account.phone_masked]
                .filter(Boolean)
                .join(' · ') || 'No contact details on file'}
            </p>
          </div>
          <Text variant="muted" className="text-xs">
            Link this profile to their ticket and admit them. Prefer a ticket that matches by email or
            phone; a name-only match needs a photo-ID check.
          </Text>
          {candidates.length > 0 ? (
            <DoorCandidateList
              candidates={candidates}
              actionLabel="Link & admit"
              busy={working}
              onPick={(candidate) => void linkTo(candidate.ticket_id)}
            />
          ) : (
            <TicketSearch eventId={eventId} busy={working} onPick={(row) => void linkTo(row.id)} />
          )}
        </div>
      ) : null}

      {door?.code === 'on_hold' && door.hold ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <p className="font-medium">On hold{door.hold.reason ? `: ${door.hold.reason}` : ''}</p>
          {door.hold.change_id != null ? (
            <Link
              to={`/events/${eventId}/external-tickets`}
              className="mt-1 inline-block text-xs font-semibold underline underline-offset-2"
            >
              Resolve in External tickets
            </Link>
          ) : null}
        </div>
      ) : null}

      {link.idCheck ? (
        <DoorIdCheckPrompt
          message={link.idCheck.message}
          busy={working}
          onConfirm={() =>
            void link.confirmAnyway().then((result) => {
              if (result) onLinked(result);
            })
          }
          onCancel={link.reset}
        />
      ) : null}
      {link.error ? (
        <Text className="text-sm font-medium text-red-800 dark:text-red-200">{link.error}</Text>
      ) : null}
    </div>
  );
}

/**
 * Fallback when a profile QR matched no ticket: search the door list by name,
 * email or ticket number and link the right one.
 */
function TicketSearch({
  eventId,
  busy,
  onPick,
}: {
  eventId: number;
  busy: boolean;
  onPick: (row: CheckinAttendee) => void;
}) {
  const [term, setTerm] = useState('');
  const [rows, setRows] = useState<CheckinAttendee[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const search = term.trim();
    if (search.length < 2) {
      setRows([]);
      return undefined;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void checkinService
        .listAttendees(eventId, { search, page_size: 8 })
        .then((page) => {
          if (!cancelled) setRows(page.results);
        })
        .catch(() => {
          if (!cancelled) setRows([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [eventId, term]);

  return (
    <div className="space-y-2">
      <Text variant="muted" className="text-xs">
        No ticket matched this profile. Scan their ticket QR or BSCPro QR instead, or find their ticket
        by name below.
      </Text>
      <Input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search name, email, ticket…"
        aria-label="Search tickets to link"
        autoComplete="off"
      />
      {loading ? (
        <Text variant="muted" className="text-xs">
          Searching…
        </Text>
      ) : rows.length > 0 ? (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
          {rows.map((row) => {
            const source = sourceLabel(row.source, row.external_reference);
            return (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {row.holder_name || '(unassigned)'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-white/60">
                    {row.ticket_number}
                    {source ? ` · ${source}` : ''}
                    {row.holder_email ? ` · ${row.holder_email}` : ''}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {row.checked_in ? <Badge variant="info">Already checked in</Badge> : null}
                    {row.holder_linked ? <Badge variant="outline">Linked</Badge> : null}
                  </div>
                </div>
                <Button type="button" size="sm" disabled={busy} onClick={() => onPick(row)}>
                  Link & admit
                </Button>
              </li>
            );
          })}
        </ul>
      ) : term.trim().length >= 2 ? (
        <Text variant="muted" className="text-xs">
          No tickets match.
        </Text>
      ) : null}
    </div>
  );
}
