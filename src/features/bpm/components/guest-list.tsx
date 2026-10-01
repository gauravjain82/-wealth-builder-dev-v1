import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Mail, MapPin, Phone, UserRound } from 'lucide-react';
import { Button, Checkbox, Select } from '@shared/components';
import { UserDetailsLink } from '@/features/team/components/user-details-link';
import { ContactBadge } from './guest-message-history';
import {
  resolveRowColors,
  rowColorLabel,
  rowColorStyle,
} from '@shared/components/row-colors';
import { INVITE_OUTCOME_FIELDS } from '../services/bpm-service';
import type { BPMGuest, GuestInviteOutcomeField } from '../types';
import { useRowColorRules } from '../context/bpm-config-context';
import { guestStateKeys } from './guest-row-colors';
import { GuestNotesCell } from './guest-notes-cell';
import { GuestNotesModal } from './guest-notes-modal';
import { SortButton, SortHeader } from './sort-button';

/**
 * Guest Invites' list — the only consumer of this component.
 *
 * Sorting is client-side: the guests endpoint returns a date's whole list,
 * unpaginated, so the browser already holds the full set it is sorting.
 */
export type GuestInviteSortKey =
  | 'name'
  | 'location'
  | 'phone'
  | 'email'
  | 'inviter'
  | 'leader'
  | 'md'
  | 'smd';

/** The sort choices, in column order — also the phone layout's sort select. */
const SORT_OPTIONS: { key: GuestInviteSortKey; label: string }[] = [
  { key: 'name', label: 'Guest' },
  { key: 'location', label: 'Location' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'inviter', label: 'Inviter' },
  { key: 'leader', label: 'Leader' },
  { key: 'md', label: 'MD' },
  { key: 'smd', label: 'SMD' },
];

function sortValue(guest: BPMGuest, key: GuestInviteSortKey): string {
  switch (key) {
    case 'name':
      return guest.prospect_detail?.name || '';
    case 'location':
      return guest.occurrence_label || '';
    case 'phone':
      // Digits only, so "(555) 010-…" and "555-010-…" sort together.
      return (guest.prospect_detail?.phone || '').replace(/\D/g, '');
    case 'email':
      return guest.prospect_detail?.email || '';
    case 'inviter':
      return guest.inviter_name || '';
    case 'leader':
      return guest.leader_name || '';
    case 'md':
      return guest.md_name || '';
    case 'smd':
      return guest.smd_name || '';
    default:
      return '';
  }
}

interface GuestListProps {
  guests: BPMGuest[];
  /** Shown when `guests` is empty — the page knows whether that is a filter or an empty date. */
  emptyMessage?: string;
  /**
   * Show each row's location (`occurrence_label`) — set when the list spans
   * every location of a date. Off, the Location column and sort do not exist.
   */
  showLocation?: boolean;
  busy?: boolean;
  /** When set, only that row's controls disable — the rest of the list stays interactive. */
  busyGuestId?: number | null;
  /** Rows with a flag save in flight — disabled the same way as `busyGuestId`. */
  savingGuestIds?: ReadonlySet<number>;
  /**
   * Show the flag checkboxes but refuse edits. For a viewer without
   * `can_manage_guests`: Confirmed and Zoom are facts worth reading even when
   * they cannot be changed, so they stay visible, disabled.
   */
  readOnly?: boolean;
  /** Patch this guest into local state; used after notes are added from the history modal. */
  onGuestUpdated?: (updated: BPMGuest) => void;
  onSetOutcome?: (guest: BPMGuest, field: GuestInviteOutcomeField, value: boolean) => void;
  /** When set, the leftmost C (Confirmed) column is shown. */
  onSetConfirmed?: (guest: BPMGuest, value: boolean) => void;
  /**
   * When set, the Z (confirmed for Zoom) column is shown beside C. Z is only
   * meaningful for a confirmed guest — the server refuses it otherwise and clears
   * it on un-confirm — so the box is disabled and unticked until C is ticked.
   */
  onSetZoom?: (guest: BPMGuest, value: boolean) => void;
  /**
   * When set, a row-**selection** column appears to the left of everything,
   * including C. Two checkbox columns is a real risk of confusion, so they are
   * deliberately distinguishable: selection is unlabelled with a select-all in
   * its header, C is a labelled data column. Selection is for "who am I about to
   * message"; Confirmed is a fact about the guest.
   */
  selectedIds?: Set<number>;
  onToggleSelected?: (guest: BPMGuest, value: boolean) => void;
  onToggleSelectAll?: (value: boolean) => void;
  /** Open this guest's message history. Also shows the contact badge on the row. */
  onOpenMessageHistory?: (guest: BPMGuest) => void;
  onTransfer?: (guest: BPMGuest) => void;
  /** Move the guest to another BPM date, keeping this row. */
  onReschedule?: (guest: BPMGuest) => void;
  /** Move the guest to a 1-on-1 appointment instead. */
  onBookAppointment?: (guest: BPMGuest) => void;
  onRemove?: (guest: BPMGuest) => void;
}

/** Everything a row renders, bundled so the table and card layouts share one source. */
interface RowProps {
  guest: BPMGuest;
  disabled: boolean;
  readOnly: boolean;
  props: GuestListProps;
  onOpenNotes: () => void;
}

function guestName(guest: BPMGuest): string {
  return guest.prospect_detail?.name || 'guest';
}

function ConfirmedBox({ guest, disabled, readOnly, props }: RowProps) {
  return (
    <Checkbox
      checked={guest.confirmed}
      disabled={disabled || readOnly}
      aria-label={`Confirmed: ${guestName(guest)}`}
      onChange={(e) => props.onSetConfirmed?.(guest, e.target.checked)}
    />
  );
}

function ZoomBox({ guest, disabled, readOnly, props }: RowProps) {
  return (
    <Checkbox
      // Shown unticked while unconfirmed even if a stale row says otherwise —
      // the server has cleared it, or is about to.
      checked={guest.confirmed && guest.zoom}
      disabled={disabled || readOnly || !guest.confirmed}
      title={guest.confirmed ? 'Confirmed for Zoom' : 'Confirm the guest first'}
      aria-label={`Confirmed for Zoom: ${guestName(guest)}`}
      onChange={(e) => props.onSetZoom?.(guest, e.target.checked)}
    />
  );
}

function OutcomeChecklist({ guest, disabled, readOnly, props }: RowProps) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {INVITE_OUTCOME_FIELDS.map(({ field, label }) => (
        <label
          key={field}
          className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-700 dark:text-white/80"
        >
          <Checkbox
            checked={guest[field]}
            disabled={disabled || readOnly}
            onChange={(e) => props.onSetOutcome?.(guest, field, e.target.checked)}
          />
          {label}
        </label>
      ))}
    </div>
  );
}

/** Name, message-history badge, and the follow-up / rescheduled markers under it. */
function GuestIdentity({ guest, props }: RowProps) {
  return (
    <>
      <UserDetailsLink
        userId={guest.prospect}
        name={guest.prospect_detail?.name}
        className="font-medium text-slate-900 dark:text-white"
      />
      {props.onOpenMessageHistory ? (
        <div className="mt-1">
          <ContactBadge
            summary={guest.messages_summary}
            onOpen={() => props.onOpenMessageHistory?.(guest)}
          />
        </div>
      ) : null}
      {guest.followup ? (
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 dark:bg-emerald-400/10">
            Follow-up · {guest.followup.interests.length} interest
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
    </>
  );
}

/** The row's mutating actions. Rendered only when the page passed at least one. */
function RowActions({ guest, disabled, props, className }: RowProps & { className?: string }) {
  const { onReschedule, onBookAppointment, onTransfer, onRemove } = props;
  const name = guestName(guest);
  return (
    <div className={className}>
      {onReschedule ? (
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled}
          aria-label={`Reschedule ${name}`}
          onClick={() => onReschedule(guest)}
        >
          Reschedule
        </Button>
      ) : null}
      {onBookAppointment ? (
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled}
          aria-label={`Book a 1-on-1 for ${name}`}
          onClick={() => onBookAppointment(guest)}
        >
          1on1
        </Button>
      ) : null}
      {onTransfer ? (
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled}
          aria-label={`Transfer ${name}`}
          onClick={() => onTransfer(guest)}
        >
          Transfer
        </Button>
      ) : null}
      {onRemove ? (
        <Button
          size="sm"
          variant="destructive"
          disabled={disabled}
          aria-label={`Remove ${name}`}
          onClick={() => onRemove(guest)}
        >
          Remove
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Stacked card for phones and tablets, where the wide table cannot fit.
 *
 * The reason this exists: the table's Actions column sat past a 1000px minimum
 * width, so on a phone the buttons were off-screen and read as missing. A card
 * puts them in the flow instead of behind a sideways scroll nobody discovers.
 */
function GuestInviteCard(row: RowProps & { showRowActions: boolean }) {
  const { guest, props, showRowActions } = row;
  const rules = useRowColorRules();
  const colors = resolveRowColors(guestStateKeys(guest), rules);
  const colorReason = rowColorLabel(colors);
  const phone = guest.prospect_detail?.phone;
  const email = guest.prospect_detail?.email;
  const upline = [
    guest.leader_name && `Leader: ${guest.leader_name}`,
    guest.md_name && `MD: ${guest.md_name}`,
    guest.smd_name && `SMD: ${guest.smd_name}`,
  ].filter(Boolean);

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
      style={rowColorStyle(colors)}
      title={colorReason || undefined}
    >
      <div className="flex items-start gap-3">
        {props.onToggleSelected ? (
          <Checkbox
            className="mt-1"
            checked={Boolean(props.selectedIds?.has(guest.id))}
            aria-label={`Select ${guestName(guest)} to message`}
            onChange={(e) => props.onToggleSelected?.(guest, e.target.checked)}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <GuestIdentity {...row} />
        </div>
      </div>

      {props.onSetConfirmed ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-700 dark:text-white/80">
          <label className="flex items-center gap-1.5">
            <ConfirmedBox {...row} />
            Confirmed
          </label>
          {props.onSetZoom ? (
            <label className="flex items-center gap-1.5">
              <ZoomBox {...row} />
              Confirmed for Zoom
            </label>
          ) : null}
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
        {props.showLocation ? (
          <div className="flex items-center gap-2">
            <MapPin size={14} className="shrink-0 text-slate-400" />
            <span className="truncate">{guest.occurrence_label || '—'}</span>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <UserRound size={14} className="shrink-0 text-slate-400" />
          <span className="truncate">
            Invited by <UserDetailsLink userId={guest.inviter} name={guest.inviter_name} />
          </span>
        </div>
        {upline.length > 0 ? (
          <div className="text-xs text-slate-500 dark:text-white/50">{upline.join(' · ')}</div>
        ) : null}
      </div>

      {props.onSetOutcome ? (
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/10">
          <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-white/40">
            Outcome
          </div>
          <OutcomeChecklist {...row} />
        </div>
      ) : null}

      <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/10">
        <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-white/40">
          Notes
        </div>
        <GuestNotesCell guest={guest} onOpen={row.onOpenNotes} />
      </div>

      {showRowActions ? (
        <RowActions
          {...row}
          className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 dark:border-white/10"
        />
      ) : null}
    </div>
  );
}

export function GuestList(props: GuestListProps) {
  const {
    guests,
    emptyMessage = 'No guests on this BPM yet.',
    showLocation = false,
    busy,
    busyGuestId,
    savingGuestIds,
    readOnly = false,
    onGuestUpdated,
    onSetOutcome,
    onSetConfirmed,
    onSetZoom,
    selectedIds,
    onToggleSelected,
    onToggleSelectAll,
    onTransfer,
    onReschedule,
    onBookAppointment,
    onRemove,
  } = props;
  const [notesGuestId, setNotesGuestId] = useState<number | null>(null);
  const notesGuest = guests.find((guest) => guest.id === notesGuestId) ?? null;
  // The rule set is served from BPM Settings; the resolver is unchanged.
  const rules = useRowColorRules();
  const [chosenSortKey, setSortKey] = useState<GuestInviteSortKey | null>(null);
  const [ascending, setAscending] = useState(true);
  // A Location sort chosen in All-locations mode lapses with the column when the
  // list narrows back to one location, rather than sorting by something unseen.
  const sortKey = chosenSortKey === 'location' && !showLocation ? null : chosenSortKey;
  const sortOptions = showLocation ? SORT_OPTIONS : SORT_OPTIONS.filter(({ key }) => key !== 'location');

  const toggleSort = (key: GuestInviteSortKey) => {
    if (sortKey === key) {
      setAscending((previous) => !previous);
      return;
    }
    setSortKey(key);
    setAscending(true);
  };

  const sorted = useMemo(() => {
    // Unsorted means the order the server sent, which is the order guests were
    // added.
    if (!sortKey) return guests;
    const direction = ascending ? 1 : -1;
    return [...guests].sort((a, b) => {
      const left = sortValue(a, sortKey);
      const right = sortValue(b, sortKey);
      // Blanks go last in both directions: a guest with no email is not the
      // answer to "sort by email", whichever way round.
      if (!left || !right) return left === right ? 0 : left ? -1 : 1;
      return left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true }) * direction;
    });
  }, [guests, sortKey, ascending]);

  if (guests.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
        {emptyMessage}
      </p>
    );
  }

  const showInteraction = Boolean(onSetOutcome);
  const showConfirmed = Boolean(onSetConfirmed);
  const showZoom = showConfirmed && Boolean(onSetZoom);
  const showSelection = Boolean(onToggleSelected);
  // "All" means all rows *currently rendered* — the filters above this table are
  // the sender's way of narrowing who they are about to message, so select-all
  // has to respect them rather than reaching past to the whole date.
  const allSelected =
    showSelection && guests.length > 0 && guests.every((guest) => selectedIds?.has(guest.id));
  const showRowActions = Boolean(onTransfer || onReschedule || onBookAppointment || onRemove);
  const rowProps = (guest: BPMGuest): RowProps => ({
    guest,
    disabled: Boolean(busy) || busyGuestId === guest.id || Boolean(savingGuestIds?.has(guest.id)),
    readOnly,
    props,
    onOpenNotes: () => setNotesGuestId(guest.id),
  });
  const sortProps = { sortKey, ascending, onSort: toggleSort };

  return (
    <>
      {/* Card layout for phones and tablets (portrait) — the wide table can't fit. */}
      <div className="space-y-3 lg:hidden">
        <div className="flex flex-wrap items-center gap-2">
          {showSelection ? (
            <label className="mr-auto flex items-center gap-2 text-xs text-slate-600 dark:text-white/70">
              <Checkbox
                checked={allSelected}
                onChange={(e) => onToggleSelectAll?.(e.target.checked)}
              />
              {allSelected ? 'Clear selection' : 'Select all shown'}
            </label>
          ) : null}
          <Select
            variant="surface"
            className="w-auto"
            value={sortKey ?? ''}
            aria-label="Sort guests by"
            onChange={(e) => {
              setSortKey((e.target.value || null) as GuestInviteSortKey | null);
              setAscending(true);
            }}
          >
            <option value="">Order added</option>
            {sortOptions.map(({ key, label }) => (
              <option key={key} value={key}>
                Sort: {label}
              </option>
            ))}
          </Select>
          {sortKey ? (
            <Button
              size="sm"
              variant="outline"
              aria-label={ascending ? 'Sorted ascending — reverse' : 'Sorted descending — reverse'}
              onClick={() => setAscending((previous) => !previous)}
            >
              {ascending ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
            </Button>
          ) : null}
        </div>
        {sorted.map((guest) => (
          <GuestInviteCard key={guest.id} {...rowProps(guest)} showRowActions={showRowActions} />
        ))}
      </div>

      {/* Table layout for large screens. */}
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10 lg:block">
        <table className="w-full min-w-[1200px] border-collapse text-sm">
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
              {showConfirmed ? (
                <th className="w-10 px-2 py-2 text-center" title="Confirmed">
                  <abbr title="Confirmed" className="no-underline">C</abbr>
                </th>
              ) : null}
              {showZoom ? (
                <th className="w-10 px-2 py-2 text-center" title="Confirmed for Zoom">
                  <abbr title="Confirmed for Zoom" className="no-underline">Z</abbr>
                </th>
              ) : null}
              <SortHeader label="Guest" columnKey="name" {...sortProps} />
              {showLocation ? <SortHeader label="Location" columnKey="location" {...sortProps} /> : null}
              <th className="px-3 py-2">
                <div className="flex flex-col items-start gap-0.5">
                  <SortButton label="Phone" columnKey="phone" {...sortProps} />
                  <SortButton label="Email" columnKey="email" {...sortProps} />
                </div>
              </th>
              <SortHeader label="Inviter" columnKey="inviter" {...sortProps} />
              <SortHeader label="Leader" columnKey="leader" {...sortProps} />
              <SortHeader label="MD" columnKey="md" {...sortProps} />
              <SortHeader label="SMD" columnKey="smd" {...sortProps} />
              {showInteraction ? <th className="px-3 py-2">Outcome</th> : null}
              <th className="px-3 py-2">Notes</th>
              {showRowActions ? (
                // Pinned right: with every column shown the table is wider than
                // most laptop screens, and the actions are what a scroll hides.
                <th className="sticky right-0 bg-slate-50 px-3 py-2 text-right shadow-[-6px_0_8px_-6px_rgba(15,23,42,0.2)] dark:bg-[#272c34]">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {sorted.map((guest) => {
              const colors = resolveRowColors(guestStateKeys(guest), rules);
              const colorReason = rowColorLabel(colors);
              const row = rowProps(guest);
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
                        aria-label={`Select ${guestName(guest)} to message`}
                        onChange={(e) => onToggleSelected?.(guest, e.target.checked)}
                      />
                    </td>
                  ) : null}
                  {showConfirmed ? (
                    <td className="px-2 py-2 text-center">
                      <ConfirmedBox {...row} />
                    </td>
                  ) : null}
                  {showZoom ? (
                    <td className="px-2 py-2 text-center">
                      <ZoomBox {...row} />
                    </td>
                  ) : null}
                  <td className="px-3 py-2">
                    <GuestIdentity {...row} />
                  </td>
                  {showLocation ? (
                    <td className="px-3 py-2 text-slate-700 dark:text-white/80">{guest.occurrence_label || '—'}</td>
                  ) : null}
                  <td className="px-3 py-2">
                    <div className="text-slate-700 dark:text-white/80">{guest.prospect_detail?.phone || '—'}</div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-white/50">
                      {guest.prospect_detail?.email || '—'}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-700 dark:text-white/80">
                    <UserDetailsLink userId={guest.inviter} name={guest.inviter_name} />
                  </td>
                  <td className="px-3 py-2 text-slate-700 dark:text-white/80">{guest.leader_name || '—'}</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-white/80">{guest.md_name || '—'}</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-white/80">{guest.smd_name || '—'}</td>
                  {showInteraction ? (
                    <td className="px-3 py-2">
                      <OutcomeChecklist {...row} />
                    </td>
                  ) : null}
                  <td className="px-3 py-2">
                    <GuestNotesCell guest={guest} onOpen={row.onOpenNotes} />
                  </td>
                  {showRowActions ? (
                    // Opaque, unlike the row: a pinned cell over scrolled content
                    // has to hide what passes beneath it.
                    <td className="sticky right-0 bg-white px-3 py-2 shadow-[-6px_0_8px_-6px_rgba(15,23,42,0.2)] dark:bg-[#1f232b]">
                      <RowActions {...row} className="grid w-[184px] grid-cols-2 gap-1.5" />
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
