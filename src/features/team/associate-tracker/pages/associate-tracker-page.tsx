import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Block, Button, ErrorState, LoadingState, TrackerTable } from '@/shared/components';
import { useToastStore } from '@/store';
import { buildAssociateColumns } from '../associate-tracker-columns';
import {
  fetchAssociates,
  type AssociateTrackerRecord,
  type AssociateTrackerQuery,
  resetAssociateBigEvent,
  resetAssociateTraining,
  updateAssociateTracker,
} from '../services/associate-tracker-service';
import {
  createTrackerNote,
  fetchTrackerNotesForUser,
  type TrackerNote,
} from '@/features/team/services/tracker-notes-service';
import { TrackerNotesModal } from '@/features/team/components/tracker-notes-modal';

type SortDirection = 'asc' | 'desc';

function toSortParam(sort: { key: string; direction: SortDirection } | null): string | undefined {
  if (!sort) return undefined;
  const keyMap: Record<string, string> = {
    user_name: 'name',
    recruiter: 'recruiter_name',
    leader: 'leader_name',
  };
  const mapped = keyMap[sort.key] || sort.key;
  return sort.direction === 'desc' ? `-${mapped}` : mapped;
}

function toBackendFilters(filters: Record<string, string>): Record<string, string> {
  const keyMap: Record<string, string> = {
    user_name: 'name',
    recruiter: 'recruiter_name',
    leader: 'leader_name',
  };

  return Object.entries(filters).reduce<Record<string, string>>((acc, [key, value]) => {
    const normalized = value.trim();
    if (!normalized) return acc;
    acc[keyMap[key] || key] = normalized;
    return acc;
  }, {});
}

export default function AssociateTrackerPage() {
  const pageHeading = 'Associate Tracker';
  const pageDescription = "Monitor your associates' activity and progress";

  const [rows, setRows] = useState<AssociateTrackerRecord[]>([]);
  const [savingKeySet, setSavingKeySet] = useState<Set<string>>(new Set());
  const [notesByUserId, setNotesByUserId] = useState<Record<number, TrackerNote[]>>({});
  const [loadingNoteUserIdSet, setLoadingNoteUserIdSet] = useState<Set<number>>(new Set());
  const [noteDraftByUserId, setNoteDraftByUserId] = useState<Record<number, string>>({});
  const [focusedNoteInputId, setFocusedNoteInputId] = useState<number | null>(null);
  const [savingNoteUserIdSet, setSavingNoteUserIdSet] = useState<Set<number>>(new Set());
  const [notesOpenFor, setNotesOpenFor] = useState<AssociateTrackerRecord | null>(null);
  const [modalNoteDraft, setModalNoteDraft] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextPageNum, setNextPageNum] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [sortState, setSortState] = useState<{ key: string; direction: SortDirection } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [resettingAction, setResettingAction] = useState<'big-event' | 'training' | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const pageSize = 10;
  const addToast = useToastStore((state) => state.addToast);

  const handleToggle = async (userId: number, field: keyof AssociateTrackerRecord, value: boolean) => {
    const savingKey = `${userId}:${String(field)}`;
    setSavingKeySet((prev) => new Set(prev).add(savingKey));
    try {
      const updated = await updateAssociateTracker(userId, { [field]: value });
      setRows((prev) =>
        prev.map((row) => (row.user_id === userId ? { ...row, ...updated } : row))
      );
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update tracker',
      });
    } finally {
      setSavingKeySet((prev) => {
        const next = new Set(prev);
        next.delete(savingKey);
        return next;
      });
    }
  };

  const handlePatchField = async (
    userId: number,
    field: keyof AssociateTrackerRecord,
    value: number | string | null
  ) => {
    const savingKey = `${userId}:${String(field)}`;
    setSavingKeySet((prev) => new Set(prev).add(savingKey));
    try {
      const updated = await updateAssociateTracker(userId, { [field]: value });
      setRows((prev) =>
        prev.map((row) => (row.user_id === userId ? { ...row, ...updated } : row))
      );
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update tracker',
      });
    } finally {
      setSavingKeySet((prev) => {
        const next = new Set(prev);
        next.delete(savingKey);
        return next;
      });
    }
  };

  const handleNoteDraftChange = (userId: number, value: string) => {
    setNoteDraftByUserId((prev) => ({ ...prev, [userId]: value }));
  };

  const handleAddInlineNote = async (userId: number) => {
    const draft = (noteDraftByUserId[userId] || '').trim();
    if (!draft) return;

    setSavingNoteUserIdSet((prev) => new Set(prev).add(userId));
    try {
      const created = await createTrackerNote(userId, draft, 'associate');
      setNotesByUserId((prev) => {
        const current = prev[userId] || [];
        return { ...prev, [userId]: [...current, created] };
      });
      setNoteDraftByUserId((prev) => ({ ...prev, [userId]: '' }));
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save note.',
      });
    } finally {
      setSavingNoteUserIdSet((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleAddModalNote = async () => {
    if (!notesOpenFor) return;
    const text = modalNoteDraft.trim();
    if (!text) return;

    const userId = notesOpenFor.user_id;
    setSavingNoteUserIdSet((prev) => new Set(prev).add(userId));
    try {
      const created = await createTrackerNote(userId, text, 'associate');
      setNotesByUserId((prev) => {
        const current = prev[userId] || [];
        return { ...prev, [userId]: [...current, created] };
      });
      setModalNoteDraft('');
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save note.',
      });
    } finally {
      setSavingNoteUserIdSet((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const ensureNotesLoaded = async (userId: number) => {
    if (notesByUserId[userId]) return;
    setLoadingNoteUserIdSet((prev) => new Set(prev).add(userId));
    try {
      const loaded = await fetchTrackerNotesForUser(userId);
      setNotesByUserId((prev) => ({ ...prev, [userId]: loaded }));
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to load notes.',
      });
    } finally {
      setLoadingNoteUserIdSet((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const columns = useMemo(
    () =>
      buildAssociateColumns({
        onToggle: handleToggle,
        onPatch: handlePatchField,
        savingKeySet,
        notesByUserId,
        noteDraftByUserId,
        focusedNoteInputId,
        savingNoteUserIdSet,
        onNoteDraftChange: handleNoteDraftChange,
        onNoteFocus: setFocusedNoteInputId,
        onNoteBlur: () => setFocusedNoteInputId(null),
        onAddInlineNote: handleAddInlineNote,
        onOpenAllNotes: (row) => {
          void ensureNotesLoaded(row.user_id);
          setNotesOpenFor(row);
          setModalNoteDraft('');
        },
      }),
    [savingKeySet, notesByUserId, noteDraftByUserId, focusedNoteInputId, savingNoteUserIdSet]
  );

  const headerGroupRows = useMemo(
    () => [
      [
        { label: '', colSpan: 3, className: 'group-empty' },
        { label: 'PHILOSOPHY', colSpan: 3, className: 'group-main' },
        { label: 'SYSTEM', colSpan: 4, className: 'group-main' },
        { label: 'BUILD', colSpan: 10, className: 'group-main' },
      ],
    ],
    []
  );

  const loadRows = useCallback(
    async (
      pageNum: number,
      isInitial: boolean,
      nextSort: { key: string; direction: SortDirection } | null,
      nextFilters: Record<string, string>
    ) => {
      try {
        if (isInitial) {
          setLoading(true);
          setError(null);
        } else {
          setLoadingMore(true);
        }

        const query: AssociateTrackerQuery = {
          page: pageNum,
          pageSize,
          sort: toSortParam(nextSort),
          filters: toBackendFilters(nextFilters),
        };

        const data = await fetchAssociates(query);

        setTotalCount(data.count || 0);
        setHasMore(Boolean(data.next));
        setNextPageNum(pageNum + 1);
        if (isInitial) {
          setRows(data.results);
        } else {
          setRows((prev) => [...prev, ...data.results]);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load associate tracker';
        if (isInitial) setError(message);
        addToast({ type: 'error', message: 'Failed to load associate tracker.' });
      } finally {
        if (isInitial) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [addToast]
  );

  const handleResetAction = useCallback(
    async (kind: 'big-event' | 'training') => {
      const confirmed = window.confirm(
        kind === 'big-event'
          ? 'Reset Big Event for all associates?'
          : 'Reset Training for all associates?'
      );
      if (!confirmed) return;

      setResettingAction(kind);
      try {
        if (kind === 'big-event') {
          await resetAssociateBigEvent();
        } else {
          await resetAssociateTraining();
        }

        addToast({
          type: 'success',
          message:
            kind === 'big-event'
              ? 'Associate big event reset completed.'
              : 'Associate training reset completed.',
        });

        await loadRows(1, true, sortState, filters);
      } catch (err) {
        addToast({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to reset associate tracker.',
        });
      } finally {
        setResettingAction(null);
      }
    },
    [addToast, filters, loadRows, sortState]
  );

  useEffect(() => {
    void loadRows(1, true, sortState, filters);
  }, [loadRows, sortState, filters]);

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading && rows.length > 0) {
          void loadRows(nextPageNum, false, sortState, filters);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [filters, hasMore, loadRows, loading, loadingMore, nextPageNum, rows.length, sortState]);

  const notesForOpenUser = useMemo(() => {
    if (!notesOpenFor) return [];
    const notes = notesByUserId[notesOpenFor.user_id] || [];
    return [...notes].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [notesByUserId, notesOpenFor]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState
          pageHeading={pageHeading}
          pageDescription={pageDescription}
          title="Loading associate tracker"
          description="Fetching associate tracker records..."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState
          pageHeading={pageHeading}
          pageDescription={pageDescription}
          title="Error Loading Associate Tracker"
          description={error}
          retryLabel="Retry"
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col p-6">
      <Block
        title={pageHeading}
        description={`${pageDescription} • ${totalCount} total`}
        className="mb-6 flex-shrink-0"
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleResetAction('big-event')}
              disabled={resettingAction !== null}
            >
              {resettingAction === 'big-event' ? 'Resetting...' : 'Reset Events'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleResetAction('training')}
              disabled={resettingAction !== null}
            >
              {resettingAction === 'training' ? 'Resetting...' : 'Reset Training'}
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-hidden">
        <TrackerTable
          columns={columns}
          rows={rows}
          rowKey={(row) => String(row.id)}
          headerGroupRows={headerGroupRows}
          stickyFirstNColumns={3}
          resizable
          tableId="associate-tracker"
          emptyMessage="No associate tracker records found."
          className="h-full"
          serverSort={sortState}
          onServerSortChange={setSortState}
          serverFilters={filters}
          onServerFilterChange={setFilters}
        />
      </div>

      <div ref={sentinelRef} className="mt-4 flex-shrink-0">
        {loadingMore && (
          <div className="flex items-center justify-center py-4">
            <div className="text-sm text-white/60">Loading more associate records...</div>
          </div>
        )}
        {/* {!hasMore && rows.length > 0 && (
          <div className="flex items-center justify-center py-4">
            <div className="text-sm text-white/60">No more records to load</div>
          </div>
        )} */}
      </div>

      <TrackerNotesModal
        open={Boolean(notesOpenFor)}
        title={`Notes - ${notesOpenFor?.user_name || ''}`}
        notes={notesForOpenUser}
        draft={modalNoteDraft}
        saving={Boolean(
          notesOpenFor &&
            (savingNoteUserIdSet.has(notesOpenFor.user_id) ||
              loadingNoteUserIdSet.has(notesOpenFor.user_id))
        )}
        onClose={() => setNotesOpenFor(null)}
        onDraftChange={setModalNoteDraft}
        onAddNote={handleAddModalNote}
      />
    </div>
  );
}
