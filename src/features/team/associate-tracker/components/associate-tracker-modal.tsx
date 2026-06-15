import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, TrackerTable } from '@/shared/components';
import { useToastStore } from '@/store';
import { TrackerNotesModal } from '@/features/team/components/tracker-notes-modal';
import { TrackerUserProfileModal } from '@/features/team/components/tracker-user-profile-modal';
import {
  createTrackerNote,
  fetchTrackerNotesForUser,
  type TrackerNote,
} from '@/features/team/services/tracker-notes-service';
import type { TrackerUserProfile } from '@/features/team/services/tracker-user-profile-service';
import { buildAssociateColumns } from '../associate-tracker-columns';
import {
  fetchAssociates,
  updateAssociateTracker,
  type AssociateTrackerRecord,
} from '../services/associate-tracker-service';

type SortDirection = 'asc' | 'desc';

interface AssociateTrackerModalProps {
  open: boolean;
  ownerUserId: number | null;
  ownerName: string;
  onClose: () => void;
}

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
    if (normalized) acc[keyMap[key] || key] = normalized;
    return acc;
  }, {});
}

export function AssociateTrackerModal({
  open,
  ownerUserId,
  ownerName,
  onClose,
}: AssociateTrackerModalProps) {
  const addToast = useToastStore((state) => state.addToast);
  const [rows, setRows] = useState<AssociateTrackerRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextPage, setNextPage] = useState(2);
  const [sortState, setSortState] = useState<{ key: string; direction: SortDirection } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [savingKeySet, setSavingKeySet] = useState<Set<string>>(new Set());
  const [notesByUserId, setNotesByUserId] = useState<Record<number, TrackerNote[]>>({});
  const [noteDraftByUserId, setNoteDraftByUserId] = useState<Record<number, string>>({});
  const [focusedNoteInputId, setFocusedNoteInputId] = useState<number | null>(null);
  const [savingNoteUserIdSet, setSavingNoteUserIdSet] = useState<Set<number>>(new Set());
  const [loadingNoteUserIdSet, setLoadingNoteUserIdSet] = useState<Set<number>>(new Set());
  const [notesOpenFor, setNotesOpenFor] = useState<AssociateTrackerRecord | null>(null);
  const [modalNoteDraft, setModalNoteDraft] = useState('');
  const [profileOpenFor, setProfileOpenFor] = useState<{
    userId: number;
    userName: string;
    avatarUrl?: string | null;
  } | null>(null);

  const loadRows = useCallback(async (
    page: number,
    append: boolean,
    nextSort: { key: string; direction: SortDirection } | null,
    nextFilters: Record<string, string>
  ) => {
    if (!ownerUserId) return;
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const data = await fetchAssociates({
        page,
        pageSize: 20,
        sort: toSortParam(nextSort),
        filters: {
          broker_id: String(ownerUserId),
          ...toBackendFilters(nextFilters),
        },
      });
      const serialStart = (page - 1) * 20;
      const loadedRows = data.results.map((row, index) => ({
        ...row,
        serial_no: serialStart + index + 1,
      }));
      setRows((prev) => append ? [...prev, ...loadedRows] : loadedRows);
      setHasMore(Boolean(data.next));
      setNextPage(page + 1);
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to load associate tracker.',
      });
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  }, [addToast, ownerUserId]);

  useEffect(() => {
    if (!open || !ownerUserId) return;
    setRows([]);
    void loadRows(1, false, sortState, filters);
  }, [filters, loadRows, open, ownerUserId, sortState]);

  const handlePatchField = useCallback(async (
    userId: number,
    field: keyof AssociateTrackerRecord,
    value: number | string | null
  ) => {
    const savingKey = `${userId}:${String(field)}`;
    setSavingKeySet((prev) => new Set(prev).add(savingKey));
    try {
      const updated = await updateAssociateTracker(userId, { [field]: value });
      setRows((prev) => prev.map((row) => row.user_id === userId ? { ...row, ...updated } : row));
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update associate tracker.',
      });
    } finally {
      setSavingKeySet((prev) => {
        const next = new Set(prev);
        next.delete(savingKey);
        return next;
      });
    }
  }, [addToast]);

  const handleToggle = useCallback(async (
    userId: number,
    field: keyof AssociateTrackerRecord,
    value: boolean
  ) => {
    const savingKey = `${userId}:${String(field)}`;
    setSavingKeySet((prev) => new Set(prev).add(savingKey));
    try {
      const updated = await updateAssociateTracker(userId, { [field]: value });
      setRows((prev) => prev.map((row) => row.user_id === userId ? { ...row, ...updated } : row));
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update associate tracker.',
      });
    } finally {
      setSavingKeySet((prev) => {
        const next = new Set(prev);
        next.delete(savingKey);
        return next;
      });
    }
  }, [addToast]);

  const ensureNotesLoaded = useCallback(async (userId: number) => {
    if (notesByUserId[userId]) return;
    setLoadingNoteUserIdSet((prev) => new Set(prev).add(userId));
    try {
      const notes = await fetchTrackerNotesForUser(userId);
      setNotesByUserId((prev) => ({ ...prev, [userId]: notes }));
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load notes.' });
    } finally {
      setLoadingNoteUserIdSet((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }, [addToast, notesByUserId]);

  const addNote = useCallback(async (userId: number, text: string) => {
    const normalized = text.trim();
    if (!normalized) return;
    setSavingNoteUserIdSet((prev) => new Set(prev).add(userId));
    try {
      const created = await createTrackerNote(userId, normalized, 'associate');
      setNotesByUserId((prev) => ({ ...prev, [userId]: [...(prev[userId] || []), created] }));
      setNoteDraftByUserId((prev) => ({ ...prev, [userId]: '' }));
      setModalNoteDraft('');
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save note.' });
    } finally {
      setSavingNoteUserIdSet((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }, [addToast]);

  const columns = useMemo(() => buildAssociateColumns({
    onToggle: (userId, field, value) => void handleToggle(userId, field, value),
    onPatch: (userId, field, value) => void handlePatchField(userId, field, value),
    onOpenUserProfile: (row) => setProfileOpenFor({
      userId: row.user_id,
      userName: row.user_name,
      avatarUrl: row.photo_thumb_url || row.avatar_url,
    }),
    savingKeySet,
    notesByUserId,
    noteDraftByUserId,
    focusedNoteInputId,
    savingNoteUserIdSet,
    onNoteDraftChange: (userId, value) => setNoteDraftByUserId((prev) => ({ ...prev, [userId]: value })),
    onNoteFocus: setFocusedNoteInputId,
    onNoteBlur: () => setFocusedNoteInputId(null),
    onAddInlineNote: async (userId) => addNote(userId, noteDraftByUserId[userId] || ''),
    onOpenAllNotes: (row) => {
      void ensureNotesLoaded(row.user_id);
      setNotesOpenFor(row);
      setModalNoteDraft('');
    },
  }), [
    addNote,
    ensureNotesLoaded,
    focusedNoteInputId,
    handlePatchField,
    handleToggle,
    noteDraftByUserId,
    notesByUserId,
    savingKeySet,
    savingNoteUserIdSet,
  ]);

  const handleProfileSaved = useCallback((updated: TrackerUserProfile) => {
    const nextName = updated.full_name?.trim() || `${updated.first_name || ''} ${updated.last_name || ''}`.trim();
    setRows((prev) => prev.map((row) => row.user_id === updated.id ? {
      ...row,
      user_name: nextName || row.user_name,
      user_email: updated.email || row.user_email,
      agency_code: updated.agency_code ?? row.agency_code,
      avatar_url: updated.avatar_url ?? row.avatar_url,
    } : row));
  }, []);

  const notesForOpenUser = useMemo(() => {
    if (!notesOpenFor) return [];
    return [...(notesByUserId[notesOpenFor.user_id] || [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [notesByUserId, notesOpenFor]);

  return (
    <Modal
      open={open}
      title={`Associate Tracker - ${ownerName}`}
      onClose={onClose}
      contentClassName="h-[94vh] w-[96vw] max-w-none flex flex-col"
    >
      <div className="min-h-0 flex-1 overflow-hidden">
        <TrackerTable
          columns={columns}
          rows={rows}
          rowKey={(row, index) => `${row.id}-${index}`}
          stickyFirstNColumns={3}
          resizable
          tableId="associate-registrations-tracker-modal"
          emptyMessage="No associate tracker records found."
          className="h-full"
          loading={loading}
          serverSort={sortState}
          onServerSortChange={setSortState}
          serverFilters={filters}
          onServerFilterChange={setFilters}
          onReachEnd={() => {
            if (hasMore && !loading && !loadingMore) {
              void loadRows(nextPage, true, sortState, filters);
            }
          }}
        />
      </div>
      {loadingMore && <div className="pt-3 text-center text-xs text-slate-600 dark:text-white/60">Loading more associate records...</div>}
      <TrackerNotesModal
        open={Boolean(notesOpenFor)}
        title={`Notes - ${notesOpenFor?.user_name || ''}`}
        notes={notesForOpenUser}
        draft={modalNoteDraft}
        saving={Boolean(notesOpenFor && (
          savingNoteUserIdSet.has(notesOpenFor.user_id) ||
          loadingNoteUserIdSet.has(notesOpenFor.user_id)
        ))}
        onClose={() => setNotesOpenFor(null)}
        onDraftChange={setModalNoteDraft}
        onAddNote={() => notesOpenFor ? addNote(notesOpenFor.user_id, modalNoteDraft) : Promise.resolve()}
      />
      <TrackerUserProfileModal
        open={Boolean(profileOpenFor)}
        userId={profileOpenFor?.userId ?? null}
        fallbackName={profileOpenFor?.userName}
        fallbackAvatarUrl={profileOpenFor?.avatarUrl}
        onClose={() => setProfileOpenFor(null)}
        onSaved={handleProfileSaved}
      />
    </Modal>
  );
}
