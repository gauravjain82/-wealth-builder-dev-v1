import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LoadingState,
  TrackerDateRangeFilter,
  TrackerTable,
  type DatePresetKey,
  type TrackerDateRangeChange,
  type TrackerTableColumn,
} from '@shared/components';
import { UserDetailsLink } from '@/features/team/components/user-details-link';
import { TrackerNotesModal } from '@/features/team/components/tracker-notes-modal';
import {
  TrackerTeamScopeFilter,
  type TrackerTeamScope,
} from '@/features/team/components/tracker-team-scope-filter';
import {
  createTrackerNote,
  fetchTrackerNotesForUser,
  type TrackerNote,
} from '@/features/team/services/tracker-notes-service';
import { useToastStore } from '@/store';
import { BPMCard, BPMPageShell } from '../components/bpm-page-shell';
import { BPMOccurrencePicker } from '../components/bpm-occurrence-picker';
import { useBpmSelection } from '../context/bpm-selection-context';
import { bpmService } from '../services/bpm-service';
import type { BPMAssociateInviteRow } from '../types';

/**
 * Associate Invites — who on my team was asked to *this date*.
 *
 * The rows are associates, not invite rows: the server sends the caller's
 * scoped team with the date's invite state joined on, so somebody nobody has
 * worked yet appears with every box unticked rather than being missing. That
 * is what makes this a working list rather than a report.
 *
 * Everything below the checkboxes is the Associate Tracker's surface,
 * inherited rather than rebuilt: `TrackerTable` for sticky columns and server
 * sort/filter, `TrackerTeamScopeFilter` for BaseShop / SuperBase / SuperTeam,
 * `TrackerNotesModal` for the history. The list spans a whole downline, so
 * sorting, filtering and paging are all server-side — sorting a page of 15 in
 * the browser would silently sort the wrong set.
 *
 * **All locations.** An associate invite is to the *date* (D21), so in
 * All-locations mode one row per associate spans every location: a flag reads
 * true if it is set at any of them, and an edit goes to the location the invite
 * is stored on (`invite_occurrence`) — or, when there is none yet, to the date's
 * first location, which then becomes where it is stored.
 */

type SortDirection = 'asc' | 'desc';

/**
 * The four per-date boxes. A chain, not four independent flags: C needs
 * Invited, Z needs C, and the server clears everything downstream of a box that
 * is unticked — so a save can change more boxes than the one clicked.
 */
type InviteFlagField = 'invited' | 'called' | 'confirmed' | 'zoom';

/** The box each flag depends on, when it has one. */
const FLAG_PREREQUISITE: Partial<Record<InviteFlagField, InviteFlagField>> = {
  confirmed: 'invited',
  zoom: 'confirmed',
};

/** What unticking a box also unticks — the server's rule, mirrored optimistically. */
const FLAG_DEPENDENTS: Partial<Record<InviteFlagField, InviteFlagField[]>> = {
  invited: ['confirmed', 'zoom'],
  confirmed: ['zoom'],
};

const FLAG_LABELS: Record<InviteFlagField, string> = {
  invited: 'Invited',
  called: 'Called',
  confirmed: 'Confirmed',
  zoom: 'Confirmed for Zoom',
};

/** Column key → the `?sort=` name the backend's sort_field_map knows. */
const SORT_KEY_MAP: Record<string, string> = {
  user_name: 'name',
  recruiter: 'recruiter_name',
  leader: 'leader_name',
};

/** Column key → the filter name the backend's filterset knows. */
const FILTER_KEY_MAP: Record<string, string> = {
  user_name: 'name',
  recruiter: 'recruiter_name',
  leader: 'leader_name',
};

const PAGE_SIZE = 15;

/** Notes added from this screen are BPM notes — that is where they were taken. */
const NOTE_TRACKER = 'bpm';

function toSortParam(sort: { key: string; direction: SortDirection } | null): string | undefined {
  if (!sort) return undefined;
  const mapped = SORT_KEY_MAP[sort.key] || sort.key;
  return sort.direction === 'desc' ? `-${mapped}` : mapped;
}

function toBackendFilters(filters: Record<string, string>): Record<string, string> {
  return Object.entries(filters).reduce<Record<string, string>>((acc, [key, value]) => {
    const normalized = value.trim();
    if (!normalized) return acc;
    acc[FILTER_KEY_MAP[key] || key] = normalized;
    return acc;
  }, {});
}

export default function AssociateInvitesPage() {
  const addToast = useToastStore((state) => state.addToast);
  // Sticky: the BPM/date chosen here follows the user to the other sub-tools.
  const { occurrence, allLocations, scopeIds, scopeOccurrences } = useBpmSelection();
  // The scope as a value: a refetch of the same occurrences must not reload the
  // list, and a response or save for a scope since left must not land on this one.
  const scopeKey = scopeIds.join(',');
  const scopeKeyRef = useRef(scopeKey);
  scopeKeyRef.current = scopeKey;

  const [rows, setRows] = useState<BPMAssociateInviteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextPage, setNextPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortState, setSortState] = useState<{ key: string; direction: SortDirection } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  // The date range lives in its own state, *not* inside `filters`, for the same
  // reason `teamScopeUserId` does: `TrackerTable` spreads its own internal
  // `searchApplied` when it reports a column search, so `onServerFilterChange`
  // emits only the column filters and **replaces** whatever else was in the
  // object. Anything parked in `filters` that the table does not own is wiped the
  // first time somebody types in a search box. Merged at request time instead.
  const [datePreset, setDatePreset] = useState<DatePresetKey>('all');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [teamScope, setTeamScope] = useState<TrackerTeamScope>('baseshop');
  const [teamScopeUserId, setTeamScopeUserId] = useState<string | null>(null);
  // Users with a flag save in flight. Per row, not per box: the boxes cascade
  // (un-inviting clears C and Z, un-confirming clears Z) and every save writes
  // all four back, so a second tick on the same row while one is saving could
  // be overwritten by the first response.
  const [savingUserIds, setSavingUserIds] = useState<Set<number>>(new Set());

  const [notesOpenFor, setNotesOpenFor] = useState<BPMAssociateInviteRow | null>(null);
  const [notes, setNotes] = useState<TrackerNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  // A stale response from a superseded filter must not overwrite a newer one —
  // these lists are worked quickly and the requests overlap.
  const latestRequestRef = useRef(0);

  const load = useCallback(
    async (page: number, isInitial: boolean) => {
      if (!scopeKey) {
        latestRequestRef.current += 1;
        setRows([]);
        setTotalCount(0);
        setHasMore(false);
        return;
      }
      const ids = scopeKey.split(',').map(Number);
      const requestId = ++latestRequestRef.current;
      if (isInitial) setLoading(true);
      else setLoadingMore(true);
      try {
        const data = await bpmService.associateInvites({
          // Exactly one of the two: several ids read the date across locations.
          ...(ids.length > 1 ? { occurrences: ids } : { occurrence: ids[0] }),
          page,
          page_size: PAGE_SIZE,
          sort: toSortParam(sortState),
          segment: teamScope.toUpperCase(),
          filters: {
            ...toBackendFilters(filters),
            ...(teamScopeUserId ? { broker_id: teamScopeUserId } : {}),
            // Inherited from `AssociateTrackerFilter`, so these narrow by the
            // associate's **ama_date** — when they joined — exactly as the same
            // control does on the Associate Tracker. Not the BPM's date, which is
            // already fixed by the selected occurrence.
            ...(dateRange.startDate ? { from_date: dateRange.startDate } : {}),
            ...(dateRange.endDate ? { to_date: dateRange.endDate } : {}),
          },
        });
        if (requestId !== latestRequestRef.current) return;
        setTotalCount(data.count || 0);
        setHasMore(Boolean(data.next));
        setNextPage(page + 1);
        setRows((previous) => (isInitial ? data.results : [...previous, ...data.results]));
      } catch (error) {
        if (requestId !== latestRequestRef.current) return;
        addToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to load associates',
        });
      } finally {
        // Guarded rather than early-returned: a `return` inside `finally`
        // swallows whatever the block was unwinding with.
        if (requestId === latestRequestRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [addToast, dateRange, filters, scopeKey, sortState, teamScope, teamScopeUserId],
  );

  // A new scope starts from page one with nothing on screen: the last scope's
  // rows carry its flags, and appending its next page to this one would mix them.
  useEffect(() => {
    setRows([]);
    setTotalCount(0);
    setHasMore(false);
    setNextPage(1);
  }, [scopeKey]);

  useEffect(() => {
    void load(1, true);
  }, [load]);

  const handleReachEnd = useCallback(() => {
    if (hasMore && !loading && !loadingMore && rows.length > 0) {
      void load(nextPage, false);
    }
  }, [hasMore, load, loading, loadingMore, nextPage, rows.length]);

  /** Apply a preset or custom range. "All Ranges" clears both bounds. */
  const handleDateRangeChange = useCallback((value: TrackerDateRangeChange) => {
    setDatePreset(value.preset);
    setDateRange({ startDate: value.startDate, endDate: value.endDate });
  }, []);

  const handleTeamScopeChange = useCallback(
    (next: { scope: TrackerTeamScope; user: { id: string } | null }) => {
      setTeamScope(next.scope);
      setTeamScopeUserId(next.user?.id || null);
    },
    [],
  );

  /**
   * Optimistic toggle, reverted on failure.
   *
   * Optimistic because this is worked down a list at speed and a round trip per
   * tick would make the boxes feel stuck; reverted rather than left hopeful
   * because "invited" drives the Agents Invited card on Check-In, and a box
   * that lies is worse than one that flickers.
   */
  const setFlag = useCallback(
    async (row: BPMAssociateInviteRow, field: InviteFlagField, value: boolean) => {
      // Where the invite is stored, else the date's first location (D21). Outside
      // All-locations mode both are the selected occurrence.
      const occurrenceId = row.invite_occurrence ?? scopeIds[0];
      if (occurrenceId === undefined) return;
      const scopeAtSave = scopeKeyRef.current;
      // A response that lands after the scope changed belongs to rows no longer shown.
      const patchRow = (patch: (entry: BPMAssociateInviteRow) => BPMAssociateInviteRow) => {
        if (scopeKeyRef.current !== scopeAtSave) return;
        setRows((current) =>
          current.map((entry) => (entry.user_id === row.user_id ? patch(entry) : entry)),
        );
      };
      // Every box this save may touch, so a failure restores all of them.
      const touched: InviteFlagField[] = [field, ...(value ? [] : FLAG_DEPENDENTS[field] ?? [])];
      const previous = Object.fromEntries(touched.map((key) => [key, row[key]]));
      const optimistic = Object.fromEntries(touched.map((key) => [key, key === field ? value : false]));
      setSavingUserIds((ids) => new Set(ids).add(row.user_id));
      patchRow((entry) => ({ ...entry, ...optimistic }));
      try {
        const state = await bpmService.setAssociateInviteFlags({
          occurrence_id: occurrenceId,
          user_id: row.user_id,
          [field]: value,
          // Unioned flags need a unioned untick, or a flag set at a second
          // location could never be cleared from here.
          ...(scopeIds.length > 1 ? { scope_occurrence_ids: scopeIds } : {}),
        });
        patchRow((entry) => ({
          ...entry,
          invited: state.invited,
          called: state.called,
          confirmed: state.confirmed,
          zoom: state.zoom,
          invited_by: state.invited_by,
          invited_by_name: state.invited_by_name,
          // The first write creates the invite where it was sent; the next edit
          // must go to the same place, not start a second one elsewhere.
          ...(state.invite_occurrence !== undefined
            ? {
                // The server resolved the union's holder — trust it.
                invite_occurrence: state.invite_occurrence,
                invite_occurrence_label: state.invite_occurrence_label ?? null,
              }
            : entry.invite_occurrence === null
            ? {
                invite_occurrence: occurrenceId,
                invite_occurrence_label:
                  scopeOccurrences.find((item) => item.id === occurrenceId)?.location_detail
                    ?.label ?? null,
              }
            : {}),
        }));
      } catch (error) {
        patchRow((entry) => ({ ...entry, ...previous }));
        addToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to update invite',
        });
      } finally {
        setSavingUserIds((ids) => {
          const next = new Set(ids);
          next.delete(row.user_id);
          return next;
        });
      }
    },
    [addToast, scopeIds, scopeOccurrences],
  );

  const openNotes = useCallback(
    async (row: BPMAssociateInviteRow) => {
      setNotesOpenFor(row);
      setNoteDraft('');
      setNotes([]);
      setNotesLoading(true);
      try {
        // Every tracker's notes, not just this one's: a note follows the person,
        // and the row already shows which tracker the latest came from.
        setNotes(await fetchTrackerNotesForUser(row.user_id));
      } catch (error) {
        addToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to load notes',
        });
      } finally {
        setNotesLoading(false);
      }
    },
    [addToast],
  );

  const addNote = useCallback(async () => {
    if (!notesOpenFor) return;
    const text = noteDraft.trim();
    if (!text) return;
    setNotesLoading(true);
    try {
      const created = await createTrackerNote(notesOpenFor.user_id, text, NOTE_TRACKER);
      setNotes((current) => [...current, created]);
      setNoteDraft('');
      // Keep the row's summary honest without refetching the page.
      setRows((current) =>
        current.map((entry) =>
          entry.user_id === notesOpenFor.user_id
            ? {
                ...entry,
                latest_note_text: created.text,
                latest_note_tracker: created.tracker,
                latest_note_created_by_name: created.created_by_name ?? null,
                latest_note_created_at: created.created_at,
              }
            : entry,
        ),
      );
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save note',
      });
    } finally {
      setNotesLoading(false);
    }
  }, [addToast, noteDraft, notesOpenFor]);

  const columns = useMemo<TrackerTableColumn<BPMAssociateInviteRow>[]>(
    () => [
      {
        key: 'invited',
        label: 'Invited',
        width: 90,
        align: 'center',
        sortable: true,
        value: (row) => (row.invited ? 'Yes' : 'No'),
        render: (row) => (
          <InviteCheckbox
            row={row}
            field="invited"
            saving={savingUserIds.has(row.user_id)}
            onChange={setFlag}
          />
        ),
      },
      {
        key: 'confirmed',
        label: 'Confirmed',
        header: <abbr title="Confirmed" className="no-underline">C</abbr>,
        width: 56,
        align: 'center',
        // Not sortable: the list is sorted server-side, and `sort_field_map`
        // only knows invited / called.
        sortable: false,
        value: (row) => (row.confirmed ? 'Yes' : 'No'),
        render: (row) => (
          <InviteCheckbox
            row={row}
            field="confirmed"
            saving={savingUserIds.has(row.user_id)}
            onChange={setFlag}
          />
        ),
      },
      {
        key: 'zoom',
        label: 'Confirmed for Zoom',
        header: <abbr title="Confirmed for Zoom" className="no-underline">Z</abbr>,
        width: 56,
        align: 'center',
        sortable: false,
        value: (row) => (row.zoom ? 'Yes' : 'No'),
        render: (row) => (
          <InviteCheckbox
            row={row}
            field="zoom"
            saving={savingUserIds.has(row.user_id)}
            onChange={setFlag}
          />
        ),
      },
      {
        key: 'called',
        label: 'Called',
        width: 90,
        align: 'center',
        sortable: true,
        value: (row) => (row.called ? 'Yes' : 'No'),
        render: (row) => (
          <InviteCheckbox
            row={row}
            field="called"
            saving={savingUserIds.has(row.user_id)}
            onChange={setFlag}
          />
        ),
      },
      // Only in All-locations mode: which location the date's invite is stored
      // on. Not sortable — the list is sorted server-side on known keys only.
      ...(allLocations
        ? [
            {
              key: 'invite_location',
              label: 'Location',
              width: 150,
              sortable: false,
              value: (row: BPMAssociateInviteRow) => row.invite_occurrence_label || '',
              render: (row: BPMAssociateInviteRow) => row.invite_occurrence_label || '—',
            },
          ]
        : []),
      {
        key: 'user_name',
        label: 'Name',
        width: 240,
        sortable: true,
        searchable: true,
        value: (row) => row.name || '',
        render: (row) => (
          <div className="flex flex-col">
            <UserDetailsLink
              userId={row.user_id}
              name={row.name || `User #${row.user_id}`}
              className="font-medium text-slate-900 dark:text-white"
            />
            {row.invited_by_name ? (
              <span className="text-[11px] text-slate-500 dark:text-white/50">
                Invited by {row.invited_by_name}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'recruiter',
        label: 'Recruiter',
        width: 180,
        sortable: true,
        searchable: true,
        value: (row) => row.recruiter_name || '',
        render: (row) => row.recruiter_name || '—',
      },
      {
        key: 'leader',
        label: 'Leader',
        width: 180,
        sortable: true,
        searchable: true,
        value: (row) => row.leader_name || '',
        render: (row) => row.leader_name || '—',
      },
      {
        key: 'why',
        label: 'Why',
        width: 220,
        sortable: true,
        value: (row) => row.why || '',
        // Blank for almost everybody: legacy Associate Tracker free text, only
        // ever filled by the legacy import or by hand there.
        render: (row) => <TruncatedText text={row.why} />,
      },
      {
        key: 'goal',
        label: 'Goal',
        width: 220,
        sortable: true,
        value: (row) => row.goal || '',
        render: (row) => <TruncatedText text={row.goal} />,
      },
      {
        key: 'notes',
        label: 'Notes',
        width: 260,
        sortable: false,
        render: (row) => (
          <button
            type="button"
            className="w-full truncate text-left text-xs text-slate-600 underline-offset-2 hover:underline dark:text-white/70"
            title={row.latest_note_text || 'No notes yet'}
            onClick={() => void openNotes(row)}
          >
            {row.latest_note_text || 'Add a note…'}
          </button>
        ),
      },
    ],
    [allLocations, openNotes, savingUserIds, setFlag],
  );

  return (
    <BPMPageShell
      title="Associate Invites"
      description="Who on your team was invited to this BPM date, and who has been called."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <TrackerTeamScopeFilter
            value={teamScope}
            selectedUserId={teamScopeUserId}
            onChange={handleTeamScopeChange}
          />
          <TrackerDateRangeFilter
            value={datePreset}
            selectedRange={dateRange}
            onChange={handleDateRangeChange}
          />
        </div>
      }
    >
      <BPMCard className="mb-4">
        <BPMOccurrencePicker allowPast />
      </BPMCard>

      <BPMCard>
        {!occurrence ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
            Select a BPM and a date to work its invites.
          </p>
        ) : loading && rows.length === 0 ? (
          <LoadingState />
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-white/60">
              <span>{totalCount} associate{totalCount === 1 ? '' : 's'} in scope</span>
              {loadingMore ? <span>Loading more…</span> : null}
            </div>
            <TrackerTable
              columns={columns}
              rows={rows}
              rowKey={(row) => String(row.user_id)}
              tableId="bpm-associate-invites"
              emptyMessage="No associates in this scope."
              loading={loading}
              resizable
              // The checkboxes and the name stay put while the rest scrolls:
              // this is worked by ticking down a column against a name.
              // In All-locations mode the Location column sits before the name.
              stickyFirstNColumns={allLocations ? 6 : 5}
              serverSort={sortState}
              onServerSortChange={setSortState}
              serverFilters={filters}
              onServerFilterChange={setFilters}
              onReachEnd={handleReachEnd}
            />
          </>
        )}
      </BPMCard>

      <TrackerNotesModal
        open={Boolean(notesOpenFor)}
        title={`Notes — ${notesOpenFor?.name || ''}`}
        notes={notes}
        draft={noteDraft}
        saving={notesLoading}
        onClose={() => setNotesOpenFor(null)}
        onDraftChange={setNoteDraft}
        onAddNote={addNote}
      />
    </BPMPageShell>
  );
}

/**
 * One invite checkbox, disabled while its own save is in flight.
 *
 * A box whose prerequisite is unticked (C without Invited, Z without C) shows
 * unticked and disabled whatever the row says — the server has cleared it, and
 * would refuse to set it.
 */
function InviteCheckbox({
  row,
  field,
  saving,
  onChange,
}: {
  row: BPMAssociateInviteRow;
  field: InviteFlagField;
  saving: boolean;
  onChange: (row: BPMAssociateInviteRow, field: InviteFlagField, value: boolean) => void;
}) {
  const prerequisite = FLAG_PREREQUISITE[field];
  const blocked = prerequisite ? !row[prerequisite] : false;
  return (
    <input
      type="checkbox"
      className="h-4 w-4 cursor-pointer accent-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
      checked={!blocked && row[field]}
      disabled={saving || blocked}
      title={blocked && prerequisite ? `Tick ${FLAG_LABELS[prerequisite]} first` : FLAG_LABELS[field]}
      aria-label={`${FLAG_LABELS[field]} — ${row.name || `user ${row.user_id}`}`}
      onChange={(event) => onChange(row, field, event.target.checked)}
    />
  );
}

/** Legacy free text, shown in full on hover rather than wrapping the row. */
function TruncatedText({ text }: { text: string }) {
  if (!text) return <span className="text-slate-400 dark:text-white/30">—</span>;
  return (
    <span className="block truncate" title={text}>
      {text}
    </span>
  );
}
