import { useState } from 'react';
import { Button, Checkbox } from '@shared/components';
import { UserDetailsLink } from '@/features/team/components/user-details-link';
import { ContactBadge } from './guest-message-history';
import {
  resolveRowColors,
  rowColorLabel,
  rowColorStyle,
} from '@shared/components/row-colors';
import { formatOccurrenceTime, INVITE_OUTCOME_FIELDS } from '../services/bpm-service';
import type { BPMGuest, GuestInviteOutcomeField } from '../types';
import { useRowColorRules } from '../context/bpm-config-context';
import { guestStateKeys } from './guest-row-colors';
import { GuestNotesCell } from './guest-notes-cell';
import { GuestNotesModal } from './guest-notes-modal';

interface GuestListProps {
  guests: BPMGuest[];
  busy?: boolean;
  /** When set, only that row's controls disable — the rest of the list stays interactive. */
  busyGuestId?: number | null;
  /** Patch this guest into local state; used after notes are added from the history modal. */
  onGuestUpdated?: (updated: BPMGuest) => void;
  /** Guest Invites actions */
  onSetOutcome?: (guest: BPMGuest, field: GuestInviteOutcomeField, value: boolean) => void;
  /** When set, the leftmost Confirmed column is shown. */
  onSetConfirmed?: (guest: BPMGuest, value: boolean) => void;
  /**
   * When set, a row-**selection** column appears to the left of everything,
   * including Confirmed. Two checkbox columns is a real risk of confusion, so
   * they are deliberately distinguishable: selection is unlabelled with a
   * select-all in its header, Confirmed is a labelled data column. Selection is
   * for "who am I about to message"; Confirmed is a fact about the guest.
   */
  selectedIds?: Set<number>;
  onToggleSelected?: (guest: BPMGuest, value: boolean) => void;
  onToggleSelectAll?: (value: boolean) => void;
  /** Open this guest's message history. Also shows the contact badge on the row. */
  onOpenMessageHistory?: (guest: BPMGuest) => void;
  onFollowUp?: (guest: BPMGuest) => void;
  followUpLabel?: string;
  editFollowUpLabel?: string;
  followUpBadgeLabel?: string;
  onTransfer?: (guest: BPMGuest) => void;
  /** Move the guest to another BPM date, keeping this row. */
  onReschedule?: (guest: BPMGuest) => void;
  /** Move the guest to a 1-on-1 appointment instead. */
  onBookAppointment?: (guest: BPMGuest) => void;
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
  onSetConfirmed,
  selectedIds,
  onToggleSelected,
  onToggleSelectAll,
  onOpenMessageHistory,
  onFollowUp,
  followUpLabel = 'Follow up',
  editFollowUpLabel = 'Edit follow-up',
  followUpBadgeLabel = 'Follow-up',
  onTransfer,
  onReschedule,
  onBookAppointment,
  onRemove,
  onToggleCheckIn,
  canCheckIn = true,
}: GuestListProps) {
  const [notesGuestId, setNotesGuestId] = useState<number | null>(null);
  const notesGuest = guests.find((guest) => guest.id === notesGuestId) ?? null;
  // The rule set is served from BPM Settings; the resolver is unchanged.
  const rules = useRowColorRules();

  if (guests.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
        No guests on this BPM yet.
      </p>
    );
  }

  const showInteraction = Boolean(onSetOutcome);
  const showConfirmed = Boolean(onSetConfirmed);
  const showSelection = Boolean(onToggleSelected);
  // "All" means all rows *currently rendered* — the filters above this table are
  // the sender's way of narrowing who they are about to message, so select-all
  // has to respect them rather than reaching past to the whole date.
  const allSelected =
    showSelection && guests.length > 0 && guests.every((guest) => selectedIds?.has(guest.id));
  const showCheckIn = Boolean(onToggleCheckIn);
  const showRowActions = Boolean(
    onFollowUp || onTransfer || onReschedule || onBookAppointment || onRemove,
  );
  const rowBusy = (guestId: number) => Boolean(busy) || busyGuestId === guestId;

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
        <table className="w-full min-w-[1000px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-white/60">
              {showSelection ? (
                <th className="w-10 px-3 py-2">
                  <Checkbox
                    checked={allSelected}
                    aria-label={allSelected ? 'Clear selection' : 'Select every guest shown'}
                    onChange={(e) => onToggleSelectAll?.(e.target.checked)}
                  />
                </th>
              ) : null}
              {showConfirmed ? <th className="px-3 py-2">Confirmed</th> : null}
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
            {guests.map((guest) => {
              const colors = resolveRowColors(guestStateKeys(guest), rules);
              const colorReason = rowColorLabel(colors);
              return (
              <tr
                key={guest.id}
                className="border-t border-slate-100 dark:border-white/10"
                style={rowColorStyle(colors)}
                // Colour alone is not an accessible signal, so the reason is
                // also available as text on hover / to a screen reader.
                title={colorReason || undefined}
              >
                {showSelection ? (
                  <td className="px-3 py-2">
                    <Checkbox
                      checked={Boolean(selectedIds?.has(guest.id))}
                      aria-label={`Select ${guest.prospect_detail?.name || 'guest'} to message`}
                      onChange={(e) => onToggleSelected?.(guest, e.target.checked)}
                    />
                  </td>
                ) : null}
                {showConfirmed ? (
                  <td className="px-3 py-2">
                    <Checkbox
                      checked={guest.confirmed}
                      disabled={rowBusy(guest.id)}
                      aria-label={`Confirmed: ${guest.prospect_detail?.name || 'guest'}`}
                      onChange={(e) => onSetConfirmed?.(guest, e.target.checked)}
                    />
                  </td>
                ) : null}
                <td className="px-3 py-2">
                  <UserDetailsLink
                    userId={guest.prospect}
                    name={guest.prospect_detail?.name}
                    className="font-medium text-slate-900 dark:text-white"
                  />
                  {onOpenMessageHistory ? (
                    <div className="mt-1">
                      <ContactBadge
                        summary={guest.messages_summary}
                        onOpen={() => onOpenMessageHistory(guest)}
                      />
                    </div>
                  ) : null}
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
                  {guest.rescheduled_to_label ? (
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-white/60">
                      Rescheduled → {guest.rescheduled_to_label}
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-slate-700 dark:text-white/80">
                  {guest.prospect_detail?.phone || '—'}
                </td>
                <td className="px-3 py-2 text-slate-700 dark:text-white/80">
                  {guest.prospect_detail?.email || '—'}
                </td>
                <td className="px-3 py-2 text-slate-700 dark:text-white/80">
                  <UserDetailsLink userId={guest.inviter} name={guest.inviter_name} />
                </td>
                {showInteraction ? (
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {INVITE_OUTCOME_FIELDS.map(({ field, label }) => (
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
                      {onReschedule ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={rowBusy(guest.id)}
                          onClick={() => onReschedule(guest)}
                        >
                          Reschedule
                        </Button>
                      ) : null}
                      {onBookAppointment ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={rowBusy(guest.id)}
                          onClick={() => onBookAppointment(guest)}
                        >
                          1on1
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
              );
            })}
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
