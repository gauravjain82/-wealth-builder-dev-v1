import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Block, Button, ErrorState, LoadingState, TrackerDateRangeFilter, type DatePresetKey, type TrackerDateRangeChange, TrackerTable } from '@/shared/components';
import { useToastStore } from '@/store';
import { buildAssociateColumns } from '../associate-tracker-columns';
import {
  fetchAssociateUsersForAssociatePage,
  fetchAssociates,
  type HotRecruitUser,
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
import { TrackerUserProfileModal } from '@/features/team/components/tracker-user-profile-modal';
import { AssociateClientUsersModal, AssociateHotRecruitsModal, AssociateLicensedUsersModal } from '@/features/team/components/associate-hot-recruits-modal';
import { TrackerTeamScopeFilter, type TrackerTeamScope } from '@/features/team/components/tracker-team-scope-filter';
import type { TrackerUserProfile } from '@/features/team/services/tracker-user-profile-service';

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
  const [profileOpenFor, setProfileOpenFor] = useState<{
    userId: number;
    userName: string;
    avatarUrl?: string | null;
  } | null>(null);
  const [hotRecruitOpenFor, setHotRecruitOpenFor] = useState<{
    userId: number;
    userName: string;
    currentMonthPersonal: number | null | undefined;
    currentMonthTeam: number | null | undefined;
    rollingThreeMonthPersonal: number | null | undefined;
    rollingThreeMonthTeam: number | null | undefined;
  } | null>(null);
  const [hotRecruitsLoading, setHotRecruitsLoading] = useState(false);
  const [hotRecruitsLoadingMore, setHotRecruitsLoadingMore] = useState(false);
  const [hotRecruitsHasMore, setHotRecruitsHasMore] = useState(false);
  const [hotRecruitsNextPage, setHotRecruitsNextPage] = useState(2);
  const [hotRecruits, setHotRecruits] = useState<HotRecruitUser[]>([]);
  const [clientPointsOpenFor, setClientPointsOpenFor] = useState<{
    userId: number;
    userName: string;
    currentMonthPersonal: number | null | undefined;
    currentMonthTeam: number | null | undefined;
    pendingPersonal: number | null | undefined;
    pendingTeam: number | null | undefined;
    rollingThreeMonthPersonal: number | null | undefined;
    rollingThreeMonthTeam: number | null | undefined;
  } | null>(null);
  const [clientUsersLoading, setClientUsersLoading] = useState(false);
  const [clientUsersLoadingMore, setClientUsersLoadingMore] = useState(false);
  const [clientUsersHasMore, setClientUsersHasMore] = useState(false);
  const [clientUsersNextPage, setClientUsersNextPage] = useState(2);
  const [clientUsers, setClientUsers] = useState<HotRecruitUser[]>([]);
  const [licensedUsersOpenFor, setLicensedUsersOpenFor] = useState<{
    userId: number;
    userName: string;
  } | null>(null);
  const [licensedUsersLoading, setLicensedUsersLoading] = useState(false);
  const [licensedUsersLoadingMore, setLicensedUsersLoadingMore] = useState(false);
  const [licensedUsersHasMore, setLicensedUsersHasMore] = useState(false);
  const [licensedUsersNextPage, setLicensedUsersNextPage] = useState(2);
  const [licensedUsers, setLicensedUsers] = useState<HotRecruitUser[]>([]);

  const [loading, setLoading] = useState(true);
  const hasLoadedOnceRef = useRef(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextPageNum, setNextPageNum] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [sortState, setSortState] = useState<{ key: string; direction: SortDirection } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dateRangePreset, setDateRangePreset] = useState<DatePresetKey>('all');
  const [teamScope, setTeamScope] = useState<TrackerTeamScope>('baseshop');
  const [teamScopeUserId, setTeamScopeUserId] = useState<string | null>(null);
  const [resettingAction, setResettingAction] = useState<'big-event' | 'training' | null>(null);

  const pageSize = 15;
  const addToast = useToastStore((state) => state.addToast);

  const handleDateRangeChange = useCallback((value: TrackerDateRangeChange) => {
    setDateRangePreset(value.preset);
    setFilters((prev) => {
      const next = { ...prev };
      delete next.from_date;
      delete next.to_date;

      if (value.startDate) next.from_date = value.startDate;
      if (value.endDate) next.to_date = value.endDate;

      return next;
    });
  }, []);

  const handleTeamScopeChange = useCallback((next: { scope: TrackerTeamScope; user: { id: string; name: string } | null }) => {
    setTeamScope(next.scope);
    setTeamScopeUserId(next.user?.id || null);

    setFilters((prev) => {
      const updated = { ...prev };
      delete updated.broker_id;
      if (next.user?.id) {
        updated.broker_id = next.user.id;
      }
      return updated;
    });
  }, []);

  const selectedDateRange = useMemo(
    () => ({
      startDate: filters.from_date || '',
      endDate: filters.to_date || '',
    }),
    [filters.from_date, filters.to_date]
  );

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

  const handleOpenHotRecruits = useCallback(async (row: AssociateTrackerRecord) => {
    setHotRecruitOpenFor({
      userId: row.user_id,
      userName: row.user_name,
      currentMonthPersonal: row.current_month_personal_recruits,
      currentMonthTeam: row.current_month_team_recruits,
      rollingThreeMonthPersonal: row.last_3_month_personal_recruits,
      rollingThreeMonthTeam: row.last_3_month_team_recruits,
    });
    setHotRecruits([]);
    setHotRecruitsHasMore(false);
    setHotRecruitsLoading(true);
    try {
      const loaded = await fetchAssociateUsersForAssociatePage(row.user_id, { hot: true, pageSize: 20 });
      setHotRecruits(loaded.results);
      setHotRecruitsHasMore(Boolean(loaded.next));
      setHotRecruitsNextPage(2);
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to load hot recruits.',
      });
    } finally {
      setHotRecruitsLoading(false);
    }
  }, [addToast]);

  const handleOpenClientUsers = useCallback(async (row: AssociateTrackerRecord) => {
    setClientPointsOpenFor({
      userId: row.user_id,
      userName: row.user_name,
      currentMonthPersonal: row.current_month_personal_points,
      currentMonthTeam: row.current_month_team_points,
      pendingPersonal: row.pending_personal_points,
      pendingTeam: row.pending_team_points,
      rollingThreeMonthPersonal: row.last_3_month_personal_points,
      rollingThreeMonthTeam: row.last_3_month_team_points,
    });
    setClientUsers([]);
    setClientUsersHasMore(false);
    setClientUsersLoading(true);
    try {
      const loaded = await fetchAssociateUsersForAssociatePage(row.user_id, { client: true, pageSize: 20 });
      setClientUsers(loaded.results);
      setClientUsersHasMore(Boolean(loaded.next));
      setClientUsersNextPage(2);
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to load client users.',
      });
    } finally {
      setClientUsersLoading(false);
    }
  }, [addToast]);

  const handleOpenLicensedUsers = useCallback(async (row: AssociateTrackerRecord) => {
    setLicensedUsersOpenFor({ userId: row.user_id, userName: row.user_name });
    setLicensedUsers([]);
    setLicensedUsersHasMore(false);
    setLicensedUsersLoading(true);
    try {
      const loaded = await fetchAssociateUsersForAssociatePage(row.user_id, { licensed: true, pageSize: 20 });
      setLicensedUsers(loaded.results);
      setLicensedUsersHasMore(Boolean(loaded.next));
      setLicensedUsersNextPage(2);
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to load licensed users.',
      });
    } finally {
      setLicensedUsersLoading(false);
    }
  }, [addToast]);

  const handleReachHotRecruitsEnd = useCallback(async () => {
    if (!hotRecruitOpenFor || !hotRecruitsHasMore || hotRecruitsLoading || hotRecruitsLoadingMore) return;
    setHotRecruitsLoadingMore(true);
    try {
      const loaded = await fetchAssociateUsersForAssociatePage(hotRecruitOpenFor.userId, {
        hot: true,
        page: hotRecruitsNextPage,
        pageSize: 20,
      });
      setHotRecruits((prev) => [...prev, ...loaded.results]);
      setHotRecruitsHasMore(Boolean(loaded.next));
      setHotRecruitsNextPage((prev) => prev + 1);
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load more hot recruits.' });
    } finally {
      setHotRecruitsLoadingMore(false);
    }
  }, [addToast, hotRecruitOpenFor, hotRecruitsHasMore, hotRecruitsLoading, hotRecruitsLoadingMore, hotRecruitsNextPage]);

  const handleReachClientUsersEnd = useCallback(async () => {
    if (!clientPointsOpenFor || !clientUsersHasMore || clientUsersLoading || clientUsersLoadingMore) return;
    setClientUsersLoadingMore(true);
    try {
      const loaded = await fetchAssociateUsersForAssociatePage(clientPointsOpenFor.userId, {
        client: true,
        page: clientUsersNextPage,
        pageSize: 20,
      });
      setClientUsers((prev) => [...prev, ...loaded.results]);
      setClientUsersHasMore(Boolean(loaded.next));
      setClientUsersNextPage((prev) => prev + 1);
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load more client users.' });
    } finally {
      setClientUsersLoadingMore(false);
    }
  }, [addToast, clientPointsOpenFor, clientUsersHasMore, clientUsersLoading, clientUsersLoadingMore, clientUsersNextPage]);

  const handleReachLicensedUsersEnd = useCallback(async () => {
    if (!licensedUsersOpenFor || !licensedUsersHasMore || licensedUsersLoading || licensedUsersLoadingMore) return;
    setLicensedUsersLoadingMore(true);
    try {
      const loaded = await fetchAssociateUsersForAssociatePage(licensedUsersOpenFor.userId, {
        licensed: true,
        page: licensedUsersNextPage,
        pageSize: 20,
      });
      setLicensedUsers((prev) => [...prev, ...loaded.results]);
      setLicensedUsersHasMore(Boolean(loaded.next));
      setLicensedUsersNextPage((prev) => prev + 1);
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load more licensed users.' });
    } finally {
      setLicensedUsersLoadingMore(false);
    }
  }, [addToast, licensedUsersHasMore, licensedUsersLoading, licensedUsersLoadingMore, licensedUsersNextPage, licensedUsersOpenFor]);

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
        onOpenUserProfile: (row) => {
          setProfileOpenFor({
            userId: row.user_id,
            userName: row.user_name,
            avatarUrl: row.photo_thumb_url || row.avatar_url,
          });
        },
        onOpenHotRecruits: (row) => {
          void handleOpenHotRecruits(row);
        },
        onOpenPersonalPoints: (row) => {
          void handleOpenClientUsers(row);
        },
        onOpenLicensedUsers: (row) => {
          void handleOpenLicensedUsers(row);
        },
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
    [
      savingKeySet,
      notesByUserId,
      noteDraftByUserId,
      focusedNoteInputId,
      savingNoteUserIdSet,
      handleOpenHotRecruits,
      handleOpenClientUsers,
      handleOpenLicensedUsers,
      handleToggle,
      handlePatchField,
      handleNoteDraftChange,
      handleAddInlineNote,
      ensureNotesLoaded,
    ]
  );

  const handleProfileSaved = useCallback((updated: TrackerUserProfile) => {
    const nextName = updated.full_name?.trim() || `${updated.first_name || ''} ${updated.last_name || ''}`.trim();

    setRows((prev) =>
      prev.map((row) =>
        row.user_id === updated.id
          ? {
              ...row,
              user_name: nextName || row.user_name,
              user_email: updated.email || row.user_email,
              agency_code: updated.agency_code ?? row.agency_code,
              recruiter_name: updated.recruited_by_name ?? row.recruiter_name,
              leader_name: updated.leader_name ?? row.leader_name,
              avatar_url: updated.avatar_url ?? row.avatar_url,
            }
          : row
      )
    );

    setProfileOpenFor((prev) => {
      if (!prev || prev.userId !== updated.id) return prev;
      return {
        ...prev,
        userName: nextName || prev.userName,
        avatarUrl: updated.avatar_url ?? prev.avatarUrl,
      };
    });
  }, []);

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
          hasLoadedOnceRef.current = true;
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

  const handleReachEnd = useCallback(() => {
    if (hasMore && !loadingMore && !loading && rows.length > 0) {
      void loadRows(nextPageNum, false, sortState, filters);
    }
  }, [filters, hasMore, loadRows, loading, loadingMore, nextPageNum, rows.length, sortState]);

  const notesForOpenUser = useMemo(() => {
    if (!notesOpenFor) return [];
    const notes = notesByUserId[notesOpenFor.user_id] || [];
    return [...notes].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [notesByUserId, notesOpenFor]);

  if (loading && !hasLoadedOnceRef.current) {
    return (
      <div className="p-2">
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
      <div className="p-2">
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
    <div className="flex h-screen flex-col p-2">
      <Block
        title={pageHeading}
        description={`${pageDescription} • ${totalCount} total`}
        className="mb-2 flex-shrink-0"
        titleVariant="h5"
        actions={
          <div className="flex items-center gap-2">
            <TrackerTeamScopeFilter
              value={teamScope}
              selectedUserId={teamScopeUserId}
              onChange={handleTeamScopeChange}
            />
            <TrackerDateRangeFilter
              value={dateRangePreset}
              selectedRange={selectedDateRange}
              onChange={handleDateRangeChange}
            />
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
          loading={loading}
          serverSort={sortState}
          onServerSortChange={setSortState}
          serverFilters={filters}
          onServerFilterChange={setFilters}
          onReachEnd={handleReachEnd}
        />
      </div>

      <div className="mt-4 flex-shrink-0">
        {loadingMore && (
          <div className="flex items-center justify-center py-4">
            <div className="text-sm text-slate-400 dark:text-white/60">Loading more associate records...</div>
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

      <TrackerUserProfileModal
        open={Boolean(profileOpenFor)}
        userId={profileOpenFor?.userId ?? null}
        fallbackName={profileOpenFor?.userName}
        fallbackAvatarUrl={profileOpenFor?.avatarUrl}
        onClose={() => setProfileOpenFor(null)}
        onSaved={handleProfileSaved}
      />

      <AssociateHotRecruitsModal
        open={Boolean(hotRecruitOpenFor)}
        ownerName={hotRecruitOpenFor?.userName || ''}
        loading={hotRecruitsLoading}
        recruits={hotRecruits}
        recruitSummary={hotRecruitOpenFor || undefined}
        loadingMore={hotRecruitsLoadingMore}
        onReachEnd={() => void handleReachHotRecruitsEnd()}
        onClose={() => {
          setHotRecruitOpenFor(null);
          setHotRecruits([]);
        }}
      />

      <AssociateClientUsersModal
        open={Boolean(clientPointsOpenFor)}
        ownerName={clientPointsOpenFor?.userName || ''}
        loading={clientUsersLoading}
        users={clientUsers}
        pointsSummary={clientPointsOpenFor || undefined}
        loadingMore={clientUsersLoadingMore}
        onReachEnd={() => void handleReachClientUsersEnd()}
        onClose={() => {
          setClientPointsOpenFor(null);
          setClientUsers([]);
        }}
      />

      <AssociateLicensedUsersModal
        open={Boolean(licensedUsersOpenFor)}
        ownerName={licensedUsersOpenFor?.userName || ''}
        loading={licensedUsersLoading}
        users={licensedUsers}
        loadingMore={licensedUsersLoadingMore}
        onReachEnd={() => void handleReachLicensedUsersEnd()}
        onClose={() => {
          setLicensedUsersOpenFor(null);
          setLicensedUsers([]);
        }}
      />
    </div>
  );
}
