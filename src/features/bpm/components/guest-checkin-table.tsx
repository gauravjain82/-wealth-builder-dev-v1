import { useState } from 'react';
import { CheckCircle2, Mail, Phone, UserRound } from 'lucide-react';
import { Button, Checkbox, Input } from '@shared/components';
import { formatOccurrenceTime, GUEST_OUTCOME_FIELDS } from '../services/bpm-service';
import type { BPMGuest, BPMGuestNote, GuestOutcomeField } from '../types';

interface GuestCheckinTableProps {
  guests: BPMGuest[];
  busy?: boolean;
  canCheckIn?: boolean;
  onToggleCheckIn: (guest: BPMGuest) => void;
  onSetOutcome?: (guest: BPMGuest, field: GuestOutcomeField, value: boolean) => void;
  onAddNote?: (guest: BPMGuest, text: string) => void;
}

/** Read a note's text, tolerant of either a note object or a plain string. */
function noteText(note: BPMGuestNote | string): string {
  return typeof note === 'string' ? note : note?.text || '';
}

function noteAuthor(note: BPMGuestNote | string): string {
  return typeof note === 'string' ? '' : note?.created_by_name || '';
}

/** Notes cell: lists existing notes and (when editable) an inline add input. */
function NoteCell({
  guest,
  busy,
  onAddNote,
}: {
  guest: BPMGuest;
  busy?: boolean;
  onAddNote?: (guest: BPMGuest, text: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const notes = Array.isArray(guest.notes) ? guest.notes : [];

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onAddNote?.(guest, text);
    setDraft('');
  };

  return (
    <div className="space-y-1">
      {notes.length > 0 ? (
        <ul className="space-y-0.5">
          {notes.map((note, index) => {
            const author = noteAuthor(note);
            return (
              <li key={(typeof note === 'object' && note?.id) || index} className="text-xs text-slate-700 dark:text-white/80">
                {noteText(note)}
                {author ? <span className="text-slate-400 dark:text-white/40"> — {author}</span> : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <span className="text-xs text-slate-400">No notes</span>
      )}
      {onAddNote ? (
        <div className="flex items-center gap-1">
          <Input
            variant="surface"
            value={draft}
            disabled={busy}
            placeholder="Add note…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
          />
          <Button size="sm" variant="secondary" disabled={busy || !draft.trim()} onClick={submit}>
            Add
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Outcome checkboxes shared between the table and card layouts. */
function OutcomeChecklist({
  guest,
  busy,
  onSetOutcome,
}: {
  guest: BPMGuest;
  busy?: boolean;
  onSetOutcome?: (guest: BPMGuest, field: GuestOutcomeField, value: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {GUEST_OUTCOME_FIELDS.map(({ field, label }) => (
        <label key={field} className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-white/80">
          <Checkbox
            checked={guest[field]}
            disabled={busy}
            onChange={(e) => onSetOutcome?.(guest, field, e.target.checked)}
          />
          {label}
        </label>
      ))}
    </div>
  );
}

/** Compact stacked card used on phones and tablets where the wide table can't fit. */
function GuestCheckinCard({
  guest,
  index,
  busy,
  canCheckIn,
  onToggleCheckIn,
  onSetOutcome,
  onAddNote,
}: {
  guest: BPMGuest;
  index: number;
  busy?: boolean;
  canCheckIn: boolean;
  onToggleCheckIn: (guest: BPMGuest) => void;
  onSetOutcome?: (guest: BPMGuest, field: GuestOutcomeField, value: boolean) => void;
  onAddNote?: (guest: BPMGuest, text: string) => void;
}) {
  const location = [guest.prospect_detail?.city, guest.prospect_detail?.state].filter(Boolean).join(', ');
  const email = guest.prospect_detail?.email;
  const phone = guest.prospect_detail?.phone;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400 dark:text-white/40">#{index + 1}</span>
          <span className="truncate font-semibold text-slate-900 dark:text-white">
            {guest.prospect_detail?.name || '—'}
          </span>
        </div>
        {location ? <div className="mt-0.5 text-xs text-slate-500 dark:text-white/50">{location}</div> : null}
      </div>

      <Button
        size="sm"
        variant={guest.checked_in_at ? 'secondary' : 'default'}
        disabled={busy || !canCheckIn}
        onClick={() => onToggleCheckIn(guest)}
        className="mt-3 w-full"
      >
        {guest.checked_in_at ? 'Undo check-in' : 'Check in'}
      </Button>
      {guest.checked_in_at ? (
        <div className="mt-1.5 flex items-center justify-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={14} />
          Arrived {formatOccurrenceTime(guest.checked_in_at, { weekday: undefined })}
        </div>
      ) : null}

      <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm text-slate-700 dark:border-white/10 dark:text-white/80">
        {phone ? (
          <a href={`tel:${phone}`} className="flex items-center gap-2">
            <Phone size={14} className="shrink-0 text-slate-400" />
            <span className="truncate">{phone}</span>
          </a>
        ) : null}
        {email ? (
          <a href={`mailto:${email}`} className="flex items-center gap-2">
            <Mail size={14} className="shrink-0 text-slate-400" />
            <span className="truncate">{email}</span>
          </a>
        ) : null}
        <div className="flex items-center gap-2">
          <UserRound size={14} className="shrink-0 text-slate-400" />
          <span className="truncate">Invited by {guest.inviter_name || '—'}</span>
        </div>
      </div>

      {onSetOutcome ? (
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/10">
          <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-white/40">
            Outcome
          </div>
          <OutcomeChecklist guest={guest} busy={busy} onSetOutcome={onSetOutcome} />
        </div>
      ) : null}

      <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/10">
        <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-white/40">Notes</div>
        <NoteCell guest={guest} busy={busy} onAddNote={onAddNote} />
      </div>
    </div>
  );
}

export function GuestCheckinTable({
  guests,
  busy,
  canCheckIn = true,
  onToggleCheckIn,
  onSetOutcome,
  onAddNote,
}: GuestCheckinTableProps) {
  const showOutcome = Boolean(onSetOutcome);
  if (guests.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
        No guests match this view.
      </p>
    );
  }

  return (
    <>
      {/* Card layout for phones and tablets (portrait) — the wide table can't fit. */}
      <div className="space-y-3 lg:hidden">
        {guests.map((guest, index) => (
          <GuestCheckinCard
            key={guest.id}
            guest={guest}
            index={index}
            busy={busy}
            canCheckIn={canCheckIn}
            onToggleCheckIn={onToggleCheckIn}
            onSetOutcome={onSetOutcome}
            onAddNote={onAddNote}
          />
        ))}
      </div>

      {/* Table layout for large screens. */}
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10 lg:block">
        <table className="w-full min-w-[780px] border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-white/60">
            <th className="px-3 py-2 w-12">No</th>
            <th className="px-3 py-2">Action</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Email</th>
            <th className="px-3 py-2">Phone#</th>
            <th className="px-3 py-2">Invited By</th>
            {showOutcome ? <th className="px-3 py-2">Outcome</th> : null}
            <th className="px-3 py-2">Notes</th>
          </tr>
        </thead>
        <tbody>
          {guests.map((guest, index) => {
            return (
              <tr key={guest.id} className="border-t border-slate-100 dark:border-white/10">
                <td className="px-3 py-2 text-slate-500 dark:text-white/50">{index + 1}</td>
                <td className="px-3 py-2 align-top">
                  <div className="flex flex-col items-start gap-1">
                    <Button
                      size="sm"
                      variant={guest.checked_in_at ? 'secondary' : 'default'}
                      disabled={busy || !canCheckIn}
                      onClick={() => onToggleCheckIn(guest)}
                    >
                      {guest.checked_in_at ? 'Undo check-in' : 'Check in'}
                    </Button>
                    {guest.checked_in_at ? (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={14} />
                        Arrived {formatOccurrenceTime(guest.checked_in_at, { weekday: undefined })}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-900 dark:text-white">{guest.prospect_detail?.name || '—'}</div>
                  {(guest.prospect_detail?.city || guest.prospect_detail?.state) && (
                    <div className="text-xs text-slate-500 dark:text-white/50">
                      {[guest.prospect_detail?.city, guest.prospect_detail?.state].filter(Boolean).join(', ')}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-700 dark:text-white/80">{guest.prospect_detail?.email || '—'}</td>
                <td className="px-3 py-2 text-slate-700 dark:text-white/80">{guest.prospect_detail?.phone || '—'}</td>
                <td className="px-3 py-2 text-slate-700 dark:text-white/80">{guest.inviter_name || '—'}</td>
                {showOutcome ? (
                  <td className="px-3 py-2">
                    <OutcomeChecklist guest={guest} busy={busy} onSetOutcome={onSetOutcome} />
                  </td>
                ) : null}
                <td className="px-3 py-2 align-top">
                  <div className="min-w-[220px]">
                    <NoteCell guest={guest} busy={busy} onAddNote={onAddNote} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
}
