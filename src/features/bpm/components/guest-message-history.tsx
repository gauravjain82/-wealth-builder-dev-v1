import { useCallback, useEffect, useState } from 'react';
import { LoadingState, Modal, Text } from '@shared/components';
import { bpmService } from '../services/bpm-service';
import type { BPMGuest, BPMGuestMessageRow, BPMGuestMessageSummary } from '../types';

/** Short relative-ish stamp; a door reads "today" faster than a date. */
function when(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return date.toLocaleString(undefined, {
    ...(sameDay ? {} : { month: 'short', day: 'numeric' }),
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface ContactBadgeProps {
  summary: BPMGuestMessageSummary | null;
  onOpen: () => void;
}

/**
 * How often this guest has already been messaged about this date.
 *
 * **Renders nothing when they have never been contacted.** A "0" on every row
 * would be noise on a list where most people have not been written to, and the
 * whole point of this is to draw the eye to the ones who *have* — those are the
 * rows where sending again is a mistake.
 */
export function ContactBadge({ summary, onOpen }: ContactBadgeProps) {
  if (!summary || summary.email + summary.sms === 0) return null;
  const parts = [
    summary.email > 0 ? `${summary.email} email${summary.email === 1 ? '' : 's'}` : '',
    summary.sms > 0 ? `${summary.sms} text${summary.sms === 1 ? '' : 's'}` : '',
  ].filter(Boolean);
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${parts.join(' · ')}${
        summary.last_sent_at ? `, last ${when(summary.last_sent_at)}` : ''
      } — click for the full history`}
      className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-100 dark:border-white/20 dark:text-white/70 dark:hover:bg-white/10"
    >
      {parts.join(' · ')}
      {summary.last_sent_at ? ` · ${when(summary.last_sent_at)}` : ''}
    </button>
  );
}

interface GuestMessageHistoryModalProps {
  open: boolean;
  onClose: () => void;
  occurrenceId: number | null;
  guest: BPMGuest | null;
}

const STATUS_TONE: Record<string, string> = {
  skipped: 'text-amber-600 dark:text-amber-400',
  failed: 'text-red-600 dark:text-red-400',
};

/**
 * Every message attempt against one guest, newest first.
 *
 * Shows skips and failures alongside sends. A guest who was skipped for having
 * no phone number and shows no history at all reads as "not contacted yet" and
 * invites somebody to try exactly the same thing again.
 *
 * Fetched on open — `Modal` unmounts its children, and this is the kind of thing
 * that must not be stale when somebody is deciding whether to send.
 */
export function GuestMessageHistoryModal({
  open,
  onClose,
  occurrenceId,
  guest,
}: GuestMessageHistoryModalProps) {
  const [rows, setRows] = useState<BPMGuestMessageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (occId: number, guestId: number) => {
    setLoading(true);
    setError(null);
    try {
      setRows(await bpmService.guestMessages(occId, guestId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && occurrenceId && guest) void load(occurrenceId, guest.id);
  }, [open, occurrenceId, guest, load]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Messages to ${guest?.prospect_detail?.name || 'this guest'}`}
      contentClassName="max-w-[560px]"
    >
      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 dark:border-red-500/30 dark:bg-red-500/10">
          <Text className="text-sm font-medium">{error}</Text>
        </div>
      ) : rows.length === 0 ? (
        <Text variant="muted" className="text-sm">
          Nobody has messaged this guest about this BPM yet.
        </Text>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-lg border border-slate-200 px-3 py-2 dark:border-white/10"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {row.channel === 'EMAIL' ? 'Email' : 'Text'}
                  <span className={`ml-2 text-xs ${STATUS_TONE[row.status] || 'text-slate-500 dark:text-white/60'}`}>
                    {row.delivery_status || row.status}
                  </span>
                </span>
                <Text variant="muted" className="text-xs">
                  {when(row.created_at)}
                  {row.sent_by_name ? ` · ${row.sent_by_name}` : ''}
                </Text>
              </div>
              {row.detail ? (
                <Text variant="muted" className="mt-1 text-xs">
                  {row.detail}
                </Text>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
