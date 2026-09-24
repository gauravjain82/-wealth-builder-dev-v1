import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, Mail, Phone, UserRound } from 'lucide-react';
import { Button, Checkbox, Input } from '@shared/components';
import {
  BPM_GUEST_ROW_COLORS,
  resolveRowColors,
  rowColorLabel,
  rowColorStyle,
} from '@shared/components/row-colors';
import { UserDetailsLink } from '@/features/team/components/user-details-link';
import { formatOccurrenceTime, CHECKIN_OUTCOME_FIELDS } from '../services/bpm-service';
import type { BPMGuest, BPMGuestNote, GuestCheckinOutcomeField } from '../types';
import { guestStateKeys } from './guest-row-colors';

/**
 * Sortable columns. The keys are the *questions the list is sorted by*, not
 * field names — "arrived" sorts by check-in time, which is not the same thing
 * as sorting by the boolean.
 */
export type GuestCheckinSortKey = 'name' | 'inviter' | 'leader' | 'smd' | 'arrived';

interface GuestCheckinTableProps {
  guests: BPMGuest[];
  busy?: boolean;
  canCheckIn?: boolean;
  onToggleCheckIn: (guest: BPMGuest) => void;
  onSetOutcome?: (guest: BPMGuest, field: GuestCheckinOutcomeField, value: boolean) => void;
  onAddNote?: (guest: BPMGuest, text: string) => void;
  onFollowUp?: (guest: BPMGuest) => void;
}

/** Read a note's text, tolerant of either a note object or a plain string. */
function noteText(note: BPMGuestNote | string): string {
  return typeof note === 'string' ? note : note?.text || '';
}

function noteAuthor(note: BPMGuestNote | string): string {
  return typeof note === 'string' ? '' : note?.created_by_name || '';
}

/** The value one sort key reads off a guest. */
function sortValue(guest: BPMGuest, key: GuestCheckinSortKey): string | number {
  switch (key) {
    case 'name':
      return (guest.prospect_detail?.name || '').toLowerCase();
    case 'inviter':
      return (guest.inviter_name || '').toLowerCase();
    case 'leader':
      return (guest.leader_name || '').toLowerCase();
    case 'smd':
      return (guest.smd_name || '').toLowerCase();
    case 'arrived':
      // Not-yet-arrived sorts last ascending, which is what "sort by arrival"
      // means at a door — the people still to come are not at the top.
      return guest.checked_in_at ? Date.parse(guest.checked_in_at) : Number.MAX_SAFE_INTEGER;
    default:
      return '';
  }
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

/**
 * Outcome checkboxes shared between the table and card layouts.
 *
 * These are the **check-in** outcomes (late / stayed after / blue card /
 * scheduled appointment), not the invite outcomes Guest Invites shows. One
 * setter, two display lists — see CHECKIN_OUTCOME_FIELDS.
 */
function OutcomeChecklist({
  guest,
  busy,
  onSetOutcome,
}: {
  guest: BPMGuest;
  busy?: boolean;
  onSetOutcome?: (guest: BPMGuest, field: GuestCheckinOutcomeField, value: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {CHECKIN_OUTCOME_FIELDS.map(({ field, label }) => (
        <label key={field} className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-700 dark:text-white/80">
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

/** Small pill summarising a saved blue card (interest count + linked appointment). */
function FollowUpBadge({ guest }: { guest: BPMGuest }) {
  if (!guest.followup) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 dark:bg-emerald-400/10">
        Blue card · {guest.followup.interests.length} interest
        {guest.followup.interests.length === 1 ? '' : 's'}
      </span>
      {guest.followup.appointment ? (
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 dark:bg-emerald-400/10">Appt linked</span>
      ) : null}
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
  onFollowUp,
}: {
  guest: BPMGuest;
  index: number;
  busy?: boolean;
  canCheckIn: boolean;
  onToggleCheckIn: (guest: BPMGuest) => void;
  onSetOutcome?: (guest: BPMGuest, field: GuestCheckinOutcomeField, value: boolean) => void;
  onAddNote?: (guest: BPMGuest, text: string) => void;
  onFollowUp?: (guest: BPMGuest) => void;
}) {
  const location = [guest.prospect_detail?.city, guest.prospect_detail?.state].filter(Boolean).join(', ');
  const email = guest.prospect_detail?.email;
  const phone = guest.prospect_detail?.phone;
  const colors = resolveRowColors(guestStateKeys(guest), BPM_GUEST_ROW_COLORS);
  const colorReason = rowColorLabel(colors);

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
      style={rowColorStyle(colors)}
      title={colorReason || undefined}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400 dark:text-white/40">#{index + 1}</span>
          <UserDetailsLink
            userId={guest.prospect}
            name={guest.prospect_detail?.name}
            className="truncate font-semibold text-slate-900 dark:text-white"
          />
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
          <span className="truncate">
            Invited by <UserDetailsLink userId={guest.inviter} name={guest.inviter_name} />
          </span>
        </div>
        {guest.leader_name || guest.smd_name ? (
          <div className="text-xs text-slate-500 dark:text-white/50">
            {[guest.leader_name && `Leader: ${guest.leader_name}`, guest.smd_name && `SMD: ${guest.smd_name}`]
              .filter(Boolean)
              .join(' · ')}
          </div>
        ) : null}
      </div>

      {onSetOutcome ? (
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/10">
          <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-white/40">
            Outcome
          </div>
          <OutcomeChecklist guest={guest} busy={busy} onSetOutcome={onSetOutcome} />
        </div>
      ) : null}

      {onFollowUp ? (
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/10">
          <Button
            size="sm"
            variant={guest.followup ? 'secondary' : 'default'}
            disabled={busy}
            onClick={() => onFollowUp(guest)}
            className="w-full"
          >
            {guest.followup ? 'Edit blue card' : 'Blue card'}
          </Button>
          {guest.followup ? <div className="mt-1.5"><FollowUpBadge guest={guest} /></div> : null}
        </div>
      ) : null}

      <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/10">
        <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-white/40">Notes</div>
        <NoteCell guest={guest} busy={busy} onAddNote={onAddNote} />
      </div>
    </div>
  );
}

/** A clickable column heading that shows which way it is currently sorting. */
function SortHeader({
  label,
  columnKey,
  sortKey,
  ascending,
  onSort,
  className,
}: {
  label: string;
  columnKey: GuestCheckinSortKey;
  sortKey: GuestCheckinSortKey | null;
  ascending: boolean;
  onSort: (key: GuestCheckinSortKey) => void;
  className?: string;
}) {
  const active = sortKey === columnKey;
  return (
    <th className={`px-3 py-2 ${className || ''}`}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-900 dark:hover:text-white"
      >
        {label}
        {active ? (ascending ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : null}
      </button>
    </th>
  );
}

export function GuestCheckinTable({
  guests,
  busy,
  canCheckIn = true,
  onToggleCheckIn,
  onSetOutcome,
  onAddNote,
  onFollowUp,
}: GuestCheckinTableProps) {
  const showOutcome = Boolean(onSetOutcome);
  const showFollowUp = Boolean(onFollowUp);
  const [sortKey, setSortKey] = useState<GuestCheckinSortKey | null>(null);
  const [ascending, setAscending] = useState(true);

  const toggleSort = (key: GuestCheckinSortKey) => {
    if (sortKey === key) {
      setAscending((previous) => !previous);
      return;
    }
    setSortKey(key);
    setAscending(true);
  };

  const sorted = useMemo(() => {
    // Unsorted means the order the server sent, which is the order guests were
    // added — the default a door list wants.
    if (!sortKey) return guests;
    const direction = ascending ? 1 : -1;
    return [...guests].sort((a, b) => {
      const left = sortValue(a, sortKey);
      const right = sortValue(b, sortKey);
      if (left === right) return 0;
      return left > right ? direction : -direction;
    });
  }, [guests, sortKey, ascending]);

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
        {sorted.map((guest, index) => (
          <GuestCheckinCard
            key={guest.id}
            guest={guest}
            index={index}
            busy={busy}
            canCheckIn={canCheckIn}
            onToggleCheckIn={onToggleCheckIn}
            onSetOutcome={onSetOutcome}
            onAddNote={onAddNote}
            onFollowUp={onFollowUp}
          />
        ))}
      </div>

      {/* Table layout for large screens. */}
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10 lg:block">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-white/60">
            <th className="px-3 py-2 w-12">No</th>
            <SortHeader
              label="Action"
              columnKey="arrived"
              sortKey={sortKey}
              ascending={ascending}
              onSort={toggleSort}
            />
            <SortHeader label="Name" columnKey="name" sortKey={sortKey} ascending={ascending} onSort={toggleSort} />
            <th className="px-3 py-2">Email</th>
            <th className="px-3 py-2">Phone#</th>
            <SortHeader
              label="Invited By"
              columnKey="inviter"
              sortKey={sortKey}
              ascending={ascending}
              onSort={toggleSort}
            />
            <SortHeader label="Leader" columnKey="leader" sortKey={sortKey} ascending={ascending} onSort={toggleSort} />
            <SortHeader label="SMD" columnKey="smd" sortKey={sortKey} ascending={ascending} onSort={toggleSort} />
            {showOutcome ? <th className="px-3 py-2">Outcome</th> : null}
            {showFollowUp ? <th className="px-3 py-2">Blue card</th> : null}
            <th className="px-3 py-2">Notes</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((guest, index) => {
            const colors = resolveRowColors(guestStateKeys(guest), BPM_GUEST_ROW_COLORS);
            const colorReason = rowColorLabel(colors);
            return (
              <tr
                key={guest.id}
                // The row highlight is not decoration: at a wide table the Undo
                // button sits far from the name, and without it there is no way
                // to be sure which person is about to be un-checked-in.
                className="border-t border-slate-100 transition-colors hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/10"
                style={rowColorStyle(colors)}
                // Colour alone is not an accessible signal, so the reason is
                // also available as text on hover / to a screen reader.
                title={colorReason || undefined}
              >
                <td className="px-3 py-2 text-slate-500 dark:text-white/50">{index + 1}</td>
                <td className="px-3 py-2 align-top">
                  <div className="flex flex-col items-start gap-1">
                    <Button
                      size="sm"
                      variant={guest.checked_in_at ? 'secondary' : 'default'}
                      disabled={busy || !canCheckIn}
                      onClick={() => onToggleCheckIn(guest)}
                      aria-label={`${guest.checked_in_at ? 'Undo check-in for' : 'Check in'} ${
                        guest.prospect_detail?.name || 'guest'
                      }`}
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
                  <UserDetailsLink
                    userId={guest.prospect}
                    name={guest.prospect_detail?.name}
                    className="font-medium text-slate-900 dark:text-white"
                  />
                  {(guest.prospect_detail?.city || guest.prospect_detail?.state) && (
                    <div className="text-xs text-slate-500 dark:text-white/50">
                      {[guest.prospect_detail?.city, guest.prospect_detail?.state].filter(Boolean).join(', ')}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-700 dark:text-white/80">{guest.prospect_detail?.email || '—'}</td>
                <td className="px-3 py-2 text-slate-700 dark:text-white/80">{guest.prospect_detail?.phone || '—'}</td>
                <td className="px-3 py-2 text-slate-700 dark:text-white/80">
                  <UserDetailsLink userId={guest.inviter} name={guest.inviter_name} />
                </td>
                <td className="px-3 py-2 text-slate-700 dark:text-white/80">{guest.leader_name || '—'}</td>
                <td className="px-3 py-2 text-slate-700 dark:text-white/80">{guest.smd_name || '—'}</td>
                {showOutcome ? (
                  <td className="px-3 py-2">
                    <OutcomeChecklist guest={guest} busy={busy} onSetOutcome={onSetOutcome} />
                  </td>
                ) : null}
                {showFollowUp ? (
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-col items-start gap-1">
                      <Button
                        size="sm"
                        variant={guest.followup ? 'secondary' : 'default'}
                        disabled={busy}
                        onClick={() => onFollowUp?.(guest)}
                      >
                        {guest.followup ? 'Edit blue card' : 'Blue card'}
                      </Button>
                      <FollowUpBadge guest={guest} />
                    </div>
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
