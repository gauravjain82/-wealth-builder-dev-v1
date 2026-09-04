import { useState } from 'react';
import { Button, Checkbox } from '@shared/components';
import { formatOccurrenceTime, GUEST_OUTCOME_FIELDS } from '../services/bpm-service';
import type { BPMGuest, GuestOutcomeField } from '../types';
import { GuestNotesCell } from './guest-notes-cell';
import { GuestNotesModal } from './guest-notes-modal';

interface GuestListProps {
  guests: BPMGuest[];
  busy?: boolean;
  /** When set, only that row's controls disable — the rest of the list stays interactive. */
  busyGuestId?: number | null;
  /** Patch this guest into local state; used after notes are added from the history modal. */
  onGuestUpdated?: (updated: BPMGuest) => void;
  /** View Invites actions */
  onSetOutcome?: (guest: BPMGuest, field: GuestOutcomeField, value: boolean) => void;
  onFollowUp?: (guest: BPMGuest) => void;
  followUpLabel?: string;
  editFollowUpLabel?: string;
  followUpBadgeLabel?: string;
  onTransfer?: (guest: BPMGuest) => void;
  onRemove?: (guest: BPMGuest) => void;
  /** Guest Check-In action */
  onToggleCheckIn?: (guest: BPMGuest) => void;
  canCheckIn?: boolean;
}

export function GuestList({
  guests,
  busy,
  busyGuestId,
  onGuestUpdated,
  onSetOutcome,
  onFollowUp,
  followUpLabel = 'Follow up',
  editFollowUpLabel = 'Edit follow-up',
  followUpBadgeLabel = 'Follow-up',
  onTransfer,
  onRemove,
  onToggleCheckIn,
  canCheckIn = true,
}: GuestListProps) {
  const [notesGuestId, setNotesGuestId] = useState<number | null>(null);
  const notesGuest = guests.find((guest) => guest.id === notesGuestId) ?? null;

  if (guests.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
        No guests on this BPM yet.
      </p>
    );
  }

  const showInteraction = Boolean(onSetOutcome);
  const showCheckIn = Boolean(onToggleCheckIn);
  const showRowActions = Boolean(onFollowUp || onTransfer || onRemove);
  const rowBusy = (guestId: number) => Boolean(busy) || busyGuestId === guestId;

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-white/60">
              <th className="px-3 py-2">Guest</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Inviter</th>
              {showInteraction ? <th className="px-3 py-2">Outcome</th> : null}
              <th className="px-3 py-2">Notes</th>
              {showCheckIn ? <th className="px-3 py-2">Checked in</th> : null}
              {showRowActions || showCheckIn ? (
                <th className="px-3 py-2 text-right">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {guests.map((guest) => (
              <tr key={guest.id} className="border-t border-slate-100 dark:border-white/10">
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-900 dark:text-white">
                    {guest.prospect_detail?.name || '—'}
                  </div>
                  {guest.followup ? (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 dark:bg-emerald-400/10">
                        {followUpBadgeLabel} · {guest.followup.interests.length} interest
                        {guest.followup.interests.length === 1 ? '' : 's'}
                      </span>
                      {guest.followup.appointment ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 dark:bg-emerald-400/10">Appt linked</span>
                      ) : null}
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-slate-700 dark:text-white/80">
                  {guest.prospect_detail?.phone || '—'}
                </td>
                <td className="px-3 py-2 text-slate-700 dark:text-white/80">
                  {guest.prospect_detail?.email || '—'}
                </td>
                <td className="px-3 py-2 text-slate-700 dark:text-white/80">{guest.inviter_name || '—'}</td>
                {showInteraction ? (
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {GUEST_OUTCOME_FIELDS.map(({ field, label }) => (
                        <label
                          key={field}
                          className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-white/80"
                        >
                          <Checkbox
                            checked={guest[field]}
                            disabled={rowBusy(guest.id)}
                            onChange={(e) => onSetOutcome?.(guest, field, e.target.checked)}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </td>
                ) : null}
                <td className="px-3 py-2">
                  <GuestNotesCell guest={guest} onOpen={() => setNotesGuestId(guest.id)} />
                </td>
                {showCheckIn ? (
                  <td className="px-3 py-2">
                    {guest.checked_in_at ? (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">
                        {formatOccurrenceTime(guest.checked_in_at, { weekday: undefined })}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Not yet</span>
                    )}
                  </td>
                ) : null}
                {showRowActions || showCheckIn ? (
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      {showCheckIn ? (
                        <Button
                          size="sm"
                          variant={guest.checked_in_at ? 'secondary' : 'default'}
                          disabled={rowBusy(guest.id) || !canCheckIn}
                          onClick={() => onToggleCheckIn?.(guest)}
                        >
                          {guest.checked_in_at ? 'Undo' : 'Check in'}
                        </Button>
                      ) : null}
                      {onFollowUp ? (
                        <Button
                          size="sm"
                          variant={guest.followup ? 'secondary' : 'default'}
                          disabled={rowBusy(guest.id)}
                          onClick={() => onFollowUp(guest)}
                        >
                          {guest.followup ? editFollowUpLabel : followUpLabel}
                        </Button>
                      ) : null}
                      {onTransfer ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={rowBusy(guest.id)}
                          onClick={() => onTransfer(guest)}
                        >
                          Transfer
                        </Button>
                      ) : null}
                      {onRemove ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={rowBusy(guest.id)}
                          onClick={() => onRemove(guest)}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <GuestNotesModal
        open={Boolean(notesGuest)}
        guest={notesGuest}
        onClose={() => setNotesGuestId(null)}
        onSaved={(updated) => onGuestUpdated?.(updated)}
      />
    </>
  );
}
