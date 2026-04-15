import { useEffect, useMemo, useState } from 'react';
import { Block, ErrorState, LoadingState, TrackerTable } from '@/shared/components';
import { useToastStore } from '@/store';
import { build4x4Columns } from '../tracker-4x4-columns';
import {
  fetch4x4Tracker,
  type Tracker4x4Record,
  update4x4Tracker,
} from '../services/tracker-4x4-service';
import { fetchTrackerUsersMeta } from '@/features/team/services/tracker-user-meta-service';
import {
  createTrackerNote,
  fetchTrackerNotesForUser,
  type TrackerNote,
} from '@/features/team/services/tracker-notes-service';
import { TrackerNotesModal } from '@/features/team/components/tracker-notes-modal';

export default function Tracker4x4Page() {
  const pageHeading = '4x4 Tracker';
  const pageDescription = 'Track your 4x4 activity goals';

  const [rows, setRows] = useState<Tracker4x4Record[]>([]);
  const [savingKeySet, setSavingKeySet] = useState<Set<string>>(new Set());
  const [notesByUserId, setNotesByUserId] = useState<Record<number, TrackerNote[]>>({});
  const [loadingNoteUserIdSet, setLoadingNoteUserIdSet] = useState<Set<number>>(new Set());
  const [noteDraftByUserId, setNoteDraftByUserId] = useState<Record<number, string>>({});
  const [focusedNoteInputId, setFocusedNoteInputId] = useState<number | null>(null);
  const [savingNoteUserIdSet, setSavingNoteUserIdSet] = useState<Set<number>>(new Set());
  const [notesOpenFor, setNotesOpenFor] = useState<Tracker4x4Record | null>(null);
  const [modalNoteDraft, setModalNoteDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const addToast = useToastStore((state) => state.addToast);

  const handleToggle = async (userId: number, field: keyof Tracker4x4Record, value: boolean) => {
    const savingKey = `${userId}:${String(field)}`;
    setSavingKeySet((prev) => new Set(prev).add(savingKey));
    try {
      const updated = await update4x4Tracker(userId, { [field]: value });
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
      const created = await createTrackerNote(userId, draft, '4x4');
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
      const created = await createTrackerNote(userId, text, '4x4');
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
      build4x4Columns({
        onToggle: handleToggle,
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
        { label: '', colSpan: 4, className: 'group-empty' },
        { label: 'PHILOSOPHY', colSpan: 3, className: 'group-main' },
        { label: 'SYSTEM', colSpan: 9, className: 'group-main' },
      ],
      [
        { label: '', colSpan: 4, className: 'group-empty' },
        { label: 'MULTI HANDED', colSpan: 1, className: 'group-sub' },
        { label: '10% 3 RULES 3 GOALS', colSpan: 1, className: 'group-sub' },
        { label: 'BIG EVENT', colSpan: 1, className: 'group-sub' },
        { label: '4X4', colSpan: 9, className: 'group-sub' },
      ],
    ],
    []
  );

  useEffect(() => {
    let isMounted = true;

    const loadRows = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetch4x4Tracker();
        const metaByUserId = await fetchTrackerUsersMeta(data.map((row) => row.user_id));
        if (isMounted) {
          setRows(
            data.map((row) => {
              const meta = metaByUserId.get(row.user_id);
              return {
                ...row,
                agency_code: meta?.agency_code ?? null,
                invited_at: meta?.invited_at ?? null,
                avatar_url: meta?.avatar_url ?? null,
              };
            })
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load 4x4 tracker';
        if (isMounted) setError(message);
        addToast({ type: 'error', message: 'Failed to load 4x4 tracker.' });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadRows();
    return () => {
      isMounted = false;
    };
  }, [addToast]);

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
          title="Loading 4x4 tracker"
          description="Fetching 4x4 tracker records..."
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
          title="Error Loading 4x4 Tracker"
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
        description={`${pageDescription} • ${rows.length} total`}
        className="mb-6 flex-shrink-0"
      />

      <div className="flex-1 overflow-hidden">
        <TrackerTable
          columns={columns}
          rows={rows}
          rowKey={(row) => String(row.id)}
          headerGroupRows={headerGroupRows}
          stickyFirstNColumns={4}
          resizable
          tableId="tracker-4x4"
          emptyMessage="No 4x4 tracker records found."
          className="h-full"
        />
      </div>

      <TrackerNotesModal
        open={Boolean(notesOpenFor)}
        title={`Notes - ${notesOpenFor?.user_name || ''}`}
        notes={notesForOpenUser}
        draft={modalNoteDraft}
        saving={Boolean(
          notesOpenFor &&
            (savingNoteUserIdSet.has(notesOpenFor.user_id) || loadingNoteUserIdSet.has(notesOpenFor.user_id))
        )}
        onClose={() => setNotesOpenFor(null)}
        onDraftChange={setModalNoteDraft}
        onAddNote={handleAddModalNote}
      />
    </div>
  );
}
