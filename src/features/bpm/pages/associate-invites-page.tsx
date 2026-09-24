import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LoadingState, TrackerTable, type TrackerTableColumn } from '@shared/components';
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
 * worked yet appears with both boxes unticked rather than being missing. That
 * is what makes this a working list rather than a report.
 *
 * Everything below the two checkboxes is the Associate Tracker's surface,
 * inherited rather than rebuilt: `TrackerTable` for sticky columns and server
 * sort/filter, `TrackerTeamScopeFilter` for BaseShop / SuperBase / SuperTeam,
 * `TrackerNotesModal` for the history. The list spans a whole downline, so
 * sorting, filtering and paging are all server-side — sorting a page of 15 in
 * the browser would silently sort the wrong set.
 */

type SortDirection = 'asc' | 'desc';

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
  const { occurrence } = useBpmSelection();

  const [rows, setRows] = useState<BPMAssociateInviteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextPage, setNextPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortState, setSortState] = useState<{ key: string; direction: SortDirection } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [teamScope, setTeamScope] = useState<TrackerTeamScope>('baseshop');
  const [teamScopeUserId, setTeamScopeUserId] = useState<string | null>(null);
  // Keyed `${userId}:${field}` so two boxes on one row can save independently.
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());

  const [notesOpenFor, setNotesOpenFor] = useState<BPMAssociateInviteRow | null>(null);
  const [notes, setNotes] = useState<TrackerNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  // A stale response from a superseded filter must not overwrite a newer one —
  // these lists are worked quickly and the requests overlap.
  const latestRequestRef = useRef(0);

  const load = useCallback(
    async (page: number, isInitial: boolean) => {
      if (!occurrence) {
        setRows([]);
        setTotalCount(0);
        setHasMore(false);
        return;
      }
      const requestId = ++latestRequestRef.current;
      if (isInitial) setLoading(true);
      else setLoadingMore(true);
      try {
        const data = await bpmService.associateInvites({
          occurrence: occurrence.id,
          page,
          page_size: PAGE_SIZE,
          sort: toSortParam(sortState),
          segment: teamScope.toUpperCase(),
          filters: {
            ...toBackendFilters(filters),
            ...(teamScopeUserId ? { broker_id: teamScopeUserId } : {}),
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
    [addToast, filters, occurrence, sortState, teamScope, teamScopeUserId],
  );

  useEffect(() => {
    void load(1, true);
  }, [load]);

  const handleReachEnd = useCallback(() => {
    if (hasMore && !loading && !loadingMore && rows.length > 0) {
      void load(nextPage, false);
    }
  }, [hasMore, load, loading, loadingMore, nextPage, rows.length]);

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
    async (row: BPMAssociateInviteRow, field: 'invited' | 'called', value: boolean) => {
      if (!occurrence) return;
      const savingKey = `${row.user_id}:${field}`;
      const previous = row[field];
      setSavingKeys((keys) => new Set(keys).add(savingKey));
      setRows((current) =>
        current.map((entry) =>
          entry.user_id === row.user_id ? { ...entry, [field]: value } : entry,
        ),
      );
      try {
        const state = await bpmService.setAssociateInviteFlags({
          occurrence_id: occurrence.id,
          user_id: row.user_id,
          [field]: value,
        });
        setRows((current) =>
          current.map((entry) =>
            entry.user_id === row.user_id
              ? {
                  ...entry,
                  invited: state.invited,
                  called: state.called,
                  invited_by: state.invited_by,
                  invited_by_name: state.invited_by_name,
                }
              : entry,
          ),
        );
      } catch (error) {
        setRows((current) =>
          current.map((entry) =>
            entry.user_id === row.user_id ? { ...entry, [field]: previous } : entry,
          ),
        );
        addToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to update invite',
        });
      } finally {
        setSavingKeys((keys) => {
          const next = new Set(keys);
          next.delete(savingKey);
          return next;
        });
      }
    },
    [addToast, occurrence],
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
            saving={savingKeys.has(`${row.user_id}:invited`)}
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
            saving={savingKeys.has(`${row.user_id}:called`)}
            onChange={setFlag}
          />
        ),
      },
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
    [openNotes, savingKeys, setFlag],
  );

  return (
    <BPMPageShell
      title="Associate Invites"
      description="Who on your team was invited to this BPM date, and who has been called."
      actions={
        <TrackerTeamScopeFilter
          value={teamScope}
          selectedUserId={teamScopeUserId}
          onChange={handleTeamScopeChange}
        />
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
              // The two checkboxes and the name stay put while the rest scrolls:
              // this is worked by ticking down a column against a name.
              stickyFirstNColumns={3}
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

/** One invite checkbox, disabled while its own save is in flight. */
function InviteCheckbox({
  row,
  field,
  saving,
  onChange,
}: {
  row: BPMAssociateInviteRow;
  field: 'invited' | 'called';
  saving: boolean;
  onChange: (row: BPMAssociateInviteRow, field: 'invited' | 'called', value: boolean) => void;
}) {
  const checked = row[field];
  return (
    <input
      type="checkbox"
      className="h-4 w-4 cursor-pointer accent-emerald-500"
      checked={checked}
      disabled={saving}
      aria-label={`${field === 'invited' ? 'Invited' : 'Called'} — ${row.name || `user ${row.user_id}`}`}
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
