import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, Mail, MapPin, Phone, UserRound } from 'lucide-react';
import { Button, Checkbox, Input } from '@shared/components';
import {
  resolveRowColors,
  rowColorLabel,
  rowColorStyle,
} from '@shared/components/row-colors';
import { UserDetailsLink } from '@/features/team/components/user-details-link';
import { formatOccurrenceTime, CHECKIN_OUTCOME_FIELDS } from '../services/bpm-service';
import type { BPMGuest, BPMGuestNote, GuestCheckinOutcomeField } from '../types';
import { useRowColorRules } from '../context/bpm-config-context';
import { guestStateKeys } from './guest-row-colors';

/**
 * Sortable columns. The keys are the *questions the list is sorted by*, not
 * field names — "arrived" sorts by check-in time, which is not the same thing
 * as sorting by the boolean.
 */
export type GuestCheckinSortKey = 'name' | 'location' | 'inviter' | 'leader' | 'smd' | 'arrived';

interface GuestCheckinTableProps {
  guests: BPMGuest[];
  busy?: boolean;
  /**
   * Whether this row may be checked in right now. Per row, because in
   * All-locations mode each row sits on its own location's check-in window.
   * Omitted means always. Undo never asks.
   */
  canCheckIn?: (guest: BPMGuest) => boolean;
  /**
   * Show which location each row is at — the Location column, and a line on the
   * card. For a list spanning all of a date's locations.
   */
  showLocation?: boolean;
  onToggleCheckIn: (guest: BPMGuest) => void;
  onSetOutcome?: (guest: BPMGuest, field: GuestCheckinOutcomeField, value: boolean) => void;
  onAddNote?: (guest: BPMGuest, text: string) => void;
  onFollowUp?: (guest: BPMGuest) => void;
  /**
   * Book the blue card's 1-on-1 straight from the row, without opening the card.
   * Shown beside the Blue card button when set.
   */
  onScheduleAppointment?: (guest: BPMGuest) => void;
  /**
   * Record whether the guest attended on Zoom. When set, the Z column is shown
   * beside Action; it is only live once the guest is checked in.
   */
  onSetZoom?: (guest: BPMGuest, value: boolean) => void;
}

/**
 * Attended on Zoom, as the row should show it.
 *
 * `attended_zoom` is null until somebody sets it or the guest is checked in, and
 * until then the invite-time expectation (`zoom`) is the best answer there is.
 */
function effectiveZoom(guest: BPMGuest): boolean {
  return guest.attended_zoom ?? guest.zoom;
}

/** The Z checkbox, shared between the table and card layouts. */
function ZoomBox({
  guest,
  busy,
  onSetZoom,
}: {
  guest: BPMGuest;
  busy?: boolean;
  onSetZoom: (guest: BPMGuest, value: boolean) => void;
}) {
  const arrived = Boolean(guest.checked_in_at);
  return (
    <Checkbox
      checked={effectiveZoom(guest)}
      // Nobody attends anything until they are checked in, so before that the
      // box only reports the invite-time expectation.
      disabled={busy || !arrived}
      title={arrived ? 'Attended on Zoom' : 'Check the guest in first'}
      aria-label={`Attended on Zoom: ${guest.prospect_detail?.name || 'guest'}`}
      onChange={(e) => onSetZoom(guest, e.target.checked)}
    />
  );
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
    case 'location':
      return (guest.occurrence_label || '').toLowerCase();
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

/**
 * Blue Card button styling: **outlined blue until the card holds something,
 * solid blue after** — the brief asks for the button itself to carry the state,
 * so somebody working a door can see at a glance which guests have been through
 * the card. The solid fill is the only signal; the old "Blue card · N interests"
 * badge under it is gone.
 *
 * Keyed on the card's *content* ({@link hasBlueCardContent}), not on a followup
 * row existing: a row can exist with nothing in it — the row-level "Schedule
 * appointment" link creates one, and so does saving an untouched card — and a
 * solid button over an empty card claims work nobody did.
 *
 * Kept local rather than added as a shared `Button` variant: nothing else in the
 * app wants a blue button, and a variant exists to be reused.
 */
const BLUE_CARD_CLASS = {
  /** No card yet — present but not shouting. */
  empty:
    'border-blue-500 bg-transparent text-blue-600 hover:bg-blue-50 ' +
    'dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-400/10',
  /** Card on file. */
  saved:
    'border-blue-600 bg-blue-600 text-white hover:bg-blue-700 ' +
    'dark:border-blue-500 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-600',
} as const;

/**
 * Whether the saved card says anything: an interest, a collector, a referral, a
 * spouse name, or a linked appointment. The notes typed on the card are not on
 * the followup — they go to the prospect's notes timeline — so they cannot count.
 */
function hasBlueCardContent(guest: BPMGuest): boolean {
  const card = guest.followup;
  if (!card) return false;
  return Boolean(
    card.interests?.length ||
      card.collected_by ||
      card.referral_note?.trim() ||
      card.spouse_name?.trim() ||
      card.appointment,
  );
}

/** The two-state class for one guest's Blue Card button. */
function blueCardClass(guest: BPMGuest): string {
  return hasBlueCardContent(guest) ? BLUE_CARD_CLASS.saved : BLUE_CARD_CLASS.empty;
}

/**
 * Blue card, and Schedule appointment beside it (below it when there is no
 * room). The same pair in both layouts; `fullWidth` stretches them for the card.
 */
function FollowUpButtons({
  guest,
  busy,
  fullWidth,
  onFollowUp,
  onScheduleAppointment,
}: {
  guest: BPMGuest;
  busy?: boolean;
  fullWidth?: boolean;
  onFollowUp?: (guest: BPMGuest) => void;
  onScheduleAppointment?: (guest: BPMGuest) => void;
}) {
  const grow = fullWidth ? 'flex-1' : '';
  // Booked already: the solid Blue card button says so, and a second booking
  // would replace the link. No prospect: the link would be refused after the
  // appointment was created, leaving it orphaned.
  const canSchedule = Boolean(guest.prospect) && !guest.followup?.appointment;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {onFollowUp ? (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => onFollowUp(guest)}
          className={`whitespace-nowrap ${grow} ${blueCardClass(guest)}`}
        >
          {hasBlueCardContent(guest) ? 'Edit blue card' : 'Blue card'}
        </Button>
      ) : null}
      {onScheduleAppointment && canSchedule ? (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => onScheduleAppointment(guest)}
          className={`whitespace-nowrap ${grow}`}
        >
          Schedule appointment
        </Button>
      ) : null}
    </div>
  );
}

/**
 * The check-in / undo button, shared between both layouts.
 *
 * Only checking *in* obeys the window. Undo is always live: before the window
 * opens there is nothing to undo, and after it closes a mistake would otherwise
 * be stranded on the list for good.
 */
function CheckInButton({
  guest,
  busy,
  canCheckIn,
  onToggleCheckIn,
  className,
}: {
  guest: BPMGuest;
  busy?: boolean;
  canCheckIn: boolean;
  onToggleCheckIn: (guest: BPMGuest) => void;
  className?: string;
}) {
  const arrived = Boolean(guest.checked_in_at);
  return (
    <Button
      size="sm"
      variant={arrived ? 'secondary' : 'default'}
      disabled={busy || (!arrived && !canCheckIn)}
      onClick={() => onToggleCheckIn(guest)}
      className={className}
      aria-label={`${arrived ? 'Undo check-in for' : 'Check in'} ${guest.prospect_detail?.name || 'guest'}`}
    >
      {arrived ? 'Undo check-in' : 'Check in'}
    </Button>
  );
}

/** Compact stacked card used on phones and tablets where the wide table can't fit. */
function GuestCheckinCard({
  guest,
  index,
  busy,
  canCheckIn,
  showLocation,
  onToggleCheckIn,
  onSetOutcome,
  onAddNote,
  onFollowUp,
  onScheduleAppointment,
  onSetZoom,
}: {
  guest: BPMGuest;
  index: number;
  busy?: boolean;
  canCheckIn: boolean;
  showLocation?: boolean;
  onToggleCheckIn: (guest: BPMGuest) => void;
  onSetOutcome?: (guest: BPMGuest, field: GuestCheckinOutcomeField, value: boolean) => void;
  onAddNote?: (guest: BPMGuest, text: string) => void;
  onFollowUp?: (guest: BPMGuest) => void;
  onScheduleAppointment?: (guest: BPMGuest) => void;
  onSetZoom?: (guest: BPMGuest, value: boolean) => void;
}) {
  // Where the guest lives — not which BPM location they are on (`showLocation`).
  const hometown = [guest.prospect_detail?.city, guest.prospect_detail?.state].filter(Boolean).join(', ');
  const email = guest.prospect_detail?.email;
  const phone = guest.prospect_detail?.phone;
  // The rule set is served from BPM Settings; the resolver is unchanged.
  const rules = useRowColorRules();
  const colors = resolveRowColors(guestStateKeys(guest), rules);
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
        {hometown ? <div className="mt-0.5 text-xs text-slate-500 dark:text-white/50">{hometown}</div> : null}
        {showLocation ? (
          <div className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-white/70">
            <MapPin size={12} className="shrink-0 text-slate-400" />
            <span className="truncate">{guest.occurrence_label || '—'}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <CheckInButton
          guest={guest}
          busy={busy}
          canCheckIn={canCheckIn}
          onToggleCheckIn={onToggleCheckIn}
          className="flex-1"
        />
        {onSetZoom ? (
          <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-700 dark:text-white/80">
            <ZoomBox guest={guest} busy={busy} onSetZoom={onSetZoom} />
            Zoom
          </label>
        ) : null}
      </div>
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

      {onFollowUp || onScheduleAppointment ? (
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/10">
          <FollowUpButtons
            guest={guest}
            busy={busy}
            fullWidth
            onFollowUp={onFollowUp}
            onScheduleAppointment={onScheduleAppointment}
          />
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
  canCheckIn,
  showLocation = false,
  onToggleCheckIn,
  onSetOutcome,
  onAddNote,
  onFollowUp,
  onScheduleAppointment,
  onSetZoom,
}: GuestCheckinTableProps) {
  const showOutcome = Boolean(onSetOutcome);
  const showFollowUp = Boolean(onFollowUp || onScheduleAppointment);
  const rules = useRowColorRules();
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
            canCheckIn={canCheckIn ? canCheckIn(guest) : true}
            showLocation={showLocation}
            onToggleCheckIn={onToggleCheckIn}
            onSetOutcome={onSetOutcome}
            onAddNote={onAddNote}
            onFollowUp={onFollowUp}
            onScheduleAppointment={onScheduleAppointment}
            onSetZoom={onSetZoom}
          />
        ))}
      </div>

      {/* Table layout for large screens. */}
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10 lg:block">
        <table className="w-full min-w-[1240px] border-collapse text-sm">
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
            {onSetZoom ? (
              <th className="w-10 px-2 py-2 text-center" title="Attended on Zoom">
                <abbr title="Attended on Zoom" className="no-underline">Z</abbr>
              </th>
            ) : null}
            <SortHeader label="Name" columnKey="name" sortKey={sortKey} ascending={ascending} onSort={toggleSort} />
            {showLocation ? (
              <SortHeader
                label="Location"
                columnKey="location"
                sortKey={sortKey}
                ascending={ascending}
                onSort={toggleSort}
              />
            ) : null}
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
            const colors = resolveRowColors(guestStateKeys(guest), rules);
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
                    <CheckInButton
                      guest={guest}
                      busy={busy}
                      canCheckIn={canCheckIn ? canCheckIn(guest) : true}
                      onToggleCheckIn={onToggleCheckIn}
                    />
                    {guest.checked_in_at ? (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={14} />
                        Arrived {formatOccurrenceTime(guest.checked_in_at, { weekday: undefined })}
                      </span>
                    ) : null}
                  </div>
                </td>
                {onSetZoom ? (
                  <td className="px-2 py-2 text-center align-top">
                    <ZoomBox guest={guest} busy={busy} onSetZoom={onSetZoom} />
                  </td>
                ) : null}
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
                {showLocation ? (
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700 dark:text-white/80">
                    {guest.occurrence_label || '—'}
                  </td>
                ) : null}
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
                    <FollowUpButtons
                      guest={guest}
                      busy={busy}
                      onFollowUp={onFollowUp}
                      onScheduleAppointment={onScheduleAppointment}
                    />
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
