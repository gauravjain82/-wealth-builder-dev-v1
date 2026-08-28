import { Button, Checkbox } from '@shared/components';
import { formatOccurrenceTime, GUEST_OUTCOME_FIELDS } from '../services/bpm-service';
import type { BPMGuest, GuestOutcomeField } from '../types';

interface GuestListProps {
  guests: BPMGuest[];
  busy?: boolean;
  /** View Invites actions */
  onSetOutcome?: (guest: BPMGuest, field: GuestOutcomeField, value: boolean) => void;
  onTransfer?: (guest: BPMGuest) => void;
  onRemove?: (guest: BPMGuest) => void;
  /** Guest Check-In action */
  onToggleCheckIn?: (guest: BPMGuest) => void;
  canCheckIn?: boolean;
}

export function GuestList({
  guests,
  busy,
  onSetOutcome,
  onTransfer,
  onRemove,
  onToggleCheckIn,
  canCheckIn = true,
}: GuestListProps) {
  if (guests.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
        No guests on this BPM yet.
      </p>
    );
  }

  const showInteraction = Boolean(onSetOutcome);
  const showCheckIn = Boolean(onToggleCheckIn);
  const showRowActions = Boolean(onTransfer || onRemove);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-white/60">
            <th className="px-3 py-2">Guest</th>
            <th className="px-3 py-2">Phone</th>
            <th className="px-3 py-2">Inviter</th>
            <th className="px-3 py-2">Location</th>
            {showInteraction ? <th className="px-3 py-2">Outcome</th> : null}
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
                <div className="text-xs text-slate-500 dark:text-white/50">
                  {guest.prospect_detail?.email || ''}
                </div>
              </td>
              <td className="px-3 py-2 text-slate-700 dark:text-white/80">
                {guest.prospect_detail?.phone || '—'}
              </td>
              <td className="px-3 py-2 text-slate-700 dark:text-white/80">{guest.inviter_name || '—'}</td>
              <td className="px-3 py-2 text-slate-700 dark:text-white/80">
                {[guest.prospect_detail?.city, guest.prospect_detail?.state].filter(Boolean).join(', ') || '—'}
              </td>
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
                          disabled={busy}
                          onChange={(e) => onSetOutcome?.(guest, field, e.target.checked)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </td>
              ) : null}
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
                        disabled={busy || !canCheckIn}
                        onClick={() => onToggleCheckIn?.(guest)}
                      >
                        {guest.checked_in_at ? 'Undo' : 'Check in'}
                      </Button>
                    ) : null}
                    {onTransfer ? (
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => onTransfer(guest)}>
                        Transfer
                      </Button>
                    ) : null}
                    {onRemove ? (
                      <Button size="sm" variant="destructive" disabled={busy} onClick={() => onRemove(guest)}>
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
  );
}
