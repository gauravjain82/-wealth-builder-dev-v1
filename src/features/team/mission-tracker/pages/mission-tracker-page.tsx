import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Block, ErrorState, LoadingState, TrackerDateRangeFilter, type DatePresetKey, type TrackerDateRangeChange, TrackerTable } from '@/shared/components';
import { useToastStore } from '@/store';
import { buildMissionTrackerColumns } from '../mission-tracker-columns';
import {
  fetchMissionTracker,
  type MissionTrackerRecord,
  type MissionTrackerQuery,
  updateMissionTracker,
} from '../services/mission-tracker-service';
import {
  createTrackerNote,
  fetchTrackerNotesForUser,
  type TrackerNote,
} from '@/features/team/services/tracker-notes-service';
import { TrackerNotesModal } from '@/features/team/components/tracker-notes-modal';
import {
  AddProductionModal,
  type AddProductionFormData,
} from '@/features/team/prospect/components/add-production-modal';
import {
  createProductionRecord,
  fetchProductionCompanyProducts,
  fetchProductionSplitPresets,
} from '@/features/team/production-tracker/services/production-tracker-service';
import { TrackerTeamScopeFilter, type TrackerTeamScope } from '@/features/team/components/tracker-team-scope-filter';
import { TrackerUserProfileModal } from '@/features/team/components/tracker-user-profile-modal';
import type { TrackerUserProfile } from '@/features/team/services/tracker-user-profile-service';
import type { SavingsToggleField, SavingsAmountField } from '../mission-tracker-columns';
import {
  listMissionRingProofAttachments,
  uploadMissionRingProofAttachment,
} from '../services/mission-tracker-service';

type SortDirection = 'asc' | 'desc';
const MISSION_TRACKER_NOTE_KEY = ['4', 'x4'].join('');

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

function toSegmentParam(scope: TrackerTeamScope): string {
  return scope.toUpperCase();
}

function shouldDeferTeamScopeFetch(scope: TrackerTeamScope, teamScopeUserId: string | null): boolean {
  return scope !== 'baseshop' && !teamScopeUserId;
}

export default function MissionTrackerPage() {
  const pageHeading = 'Mission Tracker';
  const pageDescription = 'Track your mission activity goals';

  const [rows, setRows] = useState<MissionTrackerRecord[]>([]);
  const [savingKeySet, setSavingKeySet] = useState<Set<string>>(new Set());
  const [notesByUserId, setNotesByUserId] = useState<Record<number, TrackerNote[]>>({});
  const [loadingNoteUserIdSet, setLoadingNoteUserIdSet] = useState<Set<number>>(new Set());
  const [noteDraftByUserId, setNoteDraftByUserId] = useState<Record<number, string>>({});
  const [focusedNoteInputId, setFocusedNoteInputId] = useState<number | null>(null);
  const [savingNoteUserIdSet, setSavingNoteUserIdSet] = useState<Set<number>>(new Set());
  const [notesOpenFor, setNotesOpenFor] = useState<MissionTrackerRecord | null>(null);
  const [modalNoteDraft, setModalNoteDraft] = useState('');
  const [addProductionRow, setAddProductionRow] = useState<MissionTrackerRecord | null>(null);
  const [addProductionInitialForm, setAddProductionInitialForm] = useState<AddProductionFormData | null>(null);
  const [savingProduction, setSavingProduction] = useState(false);
  const [productionCompanyOptions, setProductionCompanyOptions] = useState<string[]>([]);
  const [productionProductsByCompany, setProductionProductsByCompany] =
    useState<Record<string, string[]>>({});
  const [productionSplitOptions, setProductionSplitOptions] = useState<string[]>([]);
  const [productionMultiplierTable, setProductionMultiplierTable] =
    useState<Record<string, number>>({});
  // Maps "company|product" → CompanyProduct FK id for v2 API
  const [productionCompanyProductIds, setProductionCompanyProductIds] =
    useState<Record<string, number>>({});
  const [profileOpenFor, setProfileOpenFor] = useState<{
    userId: number;
    userName: string;
    avatarUrl?: string | null;
  } | null>(null);

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

  const pageSize = 15;
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    let isMounted = true;

    const loadProductionOptions = async () => {
      try {
        const [companyProducts, splitPresets] = await Promise.all([
          fetchProductionCompanyProducts(),
          fetchProductionSplitPresets(),
        ]);

        if (!isMounted) return;

        const nextProductsByCompany: Record<string, string[]> = {};
        const nextMultiplierTable: Record<string, number> = {};
        const nextCompanyOptions = new Set<string>();

        companyProducts.forEach((item) => {
          nextCompanyOptions.add(item.company_name);
          if (!nextProductsByCompany[item.company_name]) {
            nextProductsByCompany[item.company_name] = [];
          }
          if (!nextProductsByCompany[item.company_name].includes(item.product_name)) {
            nextProductsByCompany[item.company_name] = [
              ...nextProductsByCompany[item.company_name],
              item.product_name,
            ];
          }

          const multiplier = Number(item.multiplier);
          nextMultiplierTable[`${item.company_name}|${item.product_name}`] =
            Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
        });

        const nextProductIds: Record<string, number> = {};
        companyProducts.forEach((item) => {
          nextProductIds[`${item.company_name}|${item.product_name}`] = item.id;
        });

        const nextSplitOptions = new Set<string>();
        splitPresets.forEach((preset) => {
          if (!Array.isArray(preset.splits) || preset.splits.length < 2) return;
          const option = `${preset.splits[0]}/${preset.splits[1]}`;
          if (option !== '100/0') {
            nextSplitOptions.add(option);
          }
        });

        setProductionCompanyOptions(Array.from(nextCompanyOptions));
        setProductionProductsByCompany(nextProductsByCompany);
        setProductionMultiplierTable(nextMultiplierTable);
        setProductionCompanyProductIds(nextProductIds);
        setProductionSplitOptions(Array.from(nextSplitOptions));
      } catch {
        if (!isMounted) return;
        addToast({
          type: 'error',
          message: 'Failed to load production company/product options.',
        });
      }
    };

    void loadProductionOptions();

    return () => {
      isMounted = false;
    };
  }, [addToast]);

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

  const handlePatchField = async (
    userId: number,
    field: keyof MissionTrackerRecord,
    value: number | string | boolean | null
  ) => {
    const savingKey = `${userId}:${String(field)}`;
    setSavingKeySet((prev) => new Set(prev).add(savingKey));
    try {
      const updated = await updateMissionTracker(userId, { [field]: value } as Partial<MissionTrackerRecord>);
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

  const handleToggle = async (userId: number, field: keyof MissionTrackerRecord, value: boolean) => {
    await handlePatchField(userId, field, value);
  };

  const handleNoteDraftChange = (userId: number, value: string) => {
    setNoteDraftByUserId((prev) => ({ ...prev, [userId]: value }));
  };

  const handleAddInlineNote = async (userId: number) => {
    const draft = (noteDraftByUserId[userId] || '').trim();
    if (!draft) return;

    setSavingNoteUserIdSet((prev) => new Set(prev).add(userId));
    try {
      const created = await createTrackerNote(userId, draft, MISSION_TRACKER_NOTE_KEY);
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
      const created = await createTrackerNote(userId, text, MISSION_TRACKER_NOTE_KEY);
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

  const ensureNotesLoaded = async (userId: number, force = false) => {
    if (!force && notesByUserId[userId]) return;
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

  const handleSaveAndAddProduction = useCallback(
    (row: MissionTrackerRecord, _savingsField: SavingsToggleField, _amountField: SavingsAmountField, amount: number) => {
      const today = new Date().toISOString().split('T')[0];

      // Prefill logged-in user as agent_1 from localStorage.
      let agent1Id: number | null = null;
      let agent1Name = '';
      try {
        const raw = localStorage.getItem('authUser');
        const storedUserId = localStorage.getItem('wb.userId');
        if (raw) {
          const parsed = JSON.parse(raw);
          const parsedId = Number.parseInt(String(parsed?.id ?? ''), 10);
          if (Number.isFinite(parsedId)) agent1Id = parsedId;
          agent1Name =
            parsed?.name ||
            parsed?.full_name ||
            `${parsed?.first_name || ''} ${parsed?.last_name || ''}`.trim() ||
            parsed?.email ||
            '';
        }
        if (agent1Id == null && storedUserId) {
          const parsedStoredId = Number.parseInt(storedUserId, 10);
          if (Number.isFinite(parsedStoredId)) agent1Id = parsedStoredId;
        }
        if (!agent1Name) {
          agent1Name = localStorage.getItem('wb.userName') || localStorage.getItem('wb.userEmail') || '';
        }
      } catch {
        const parsedStoredId = Number.parseInt(localStorage.getItem('wb.userId') || '', 10);
        if (Number.isFinite(parsedStoredId)) agent1Id = parsedStoredId;
        agent1Name = localStorage.getItem('wb.userName') || localStorage.getItem('wb.userEmail') || '';
      }

      const form: AddProductionFormData = {
        status: 'IN_PROGRESS',
        dateWritten: today,
        closureDate: '',
        client: row.user_name || '',
        agentMode: 'single',
        agent1Id,
        agent1Name,
        agent2Id: null,
        agent2Name: '',
        agent1Pct: 100,
        agent2Pct: 0,
        split: '100/0',
        targetPoints: String(amount),
        multiplierPercent: '',
        company: '',
        product: '',
        otherProduct: '',
        policyNumber: '',
        delivery: 'Email',
        trialApp: false,
        notes: '',
      };

      setAddProductionInitialForm(form);
      setAddProductionRow(row);
    },
    []
  );

  const handleAddProductionSubmit = useCallback(
    async (data: AddProductionFormData) => {
      if (!addProductionRow) return;
      try {
        setSavingProduction(true);
        const [pA, pB] = data.split.split('/').map((v) => parseFloat(v) || 0);
        const base = parseFloat(data.targetPoints) || 0;
        const isOther = data.company === 'OTHER' || data.product === 'OTHER';
        if (data.agent1Id == null) {
          throw new Error('Select Agent 1 before adding this record to production.');
        }
        if (data.agentMode === 'split' && data.agent2Id == null) {
          throw new Error('Select Agent 2 before adding a split production record.');
        }
        const agentSplits = [
          { agent: data.agent1Id, split_percentage: String(pA) },
          ...(data.agentMode === 'split' && data.agent2Id != null
            ? [{ agent: data.agent2Id, split_percentage: String(pB) }]
            : []),
        ];

        // v2: resolve company_product FK id; null for "OTHER"
        const company_product_id = isOther
          ? null
          : (productionCompanyProductIds[`${data.company}|${data.product}`] ?? null);

        // v2 expects base_points (raw base before multiplier) for known products.
        // For OTHER the server has no multiplier_snapshot, so send the pre-multiplied total.
        const points_target = isOther
          ? (() => {
              const pct = parseFloat(data.multiplierPercent);
              const m = Number.isNaN(pct) ? 1 : pct;
              return Math.round(base * m * 100) / 100;
            })()
          : base;

        await createProductionRecord({
          prospect: null,
          client_name: data.client,
          company_product_id,
          date_written: data.dateWritten || null,
          closure_date: data.closureDate || null,
          delivery: data.delivery,
          status: data.status,
          notes: data.notes,
          trial_app: data.trialApp,
          policy_number: data.policyNumber,
          points_target,
          agent_1: data.agent1Id,
          agent_1_name: data.agent1Name,
          agent_1_pct: pA,
          agent_2: data.agentMode === 'split' ? data.agent2Id : null,
          agent_2_name: data.agentMode === 'split' ? data.agent2Name : '',
          agent_2_pct: pB,
          split_mode: data.agentMode === 'split' ? 'split' : 'solo',
          agent_splits: agentSplits,
        });

        setAddProductionRow(null);
        setAddProductionInitialForm(null);
        addToast({ type: 'success', message: 'Added to Production Tracker.' });
      } catch (err) {
        addToast({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to save production record.',
        });
      } finally {
        setSavingProduction(false);
      }
    },
    [addProductionRow, addToast, productionCompanyProductIds]
  );

  const columns = useMemo(
    () =>
      buildMissionTrackerColumns({
        onToggle: handleToggle,
        onPatch: handlePatchField,
        onSaveAndAddProduction: handleSaveAndAddProduction,
        onOpenUserProfile: (row) => {
          setProfileOpenFor({
            userId: row.user_id,
            userName: row.user_name,
            avatarUrl: row.photo_thumb_url || row.avatar_url,
          });
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
          void ensureNotesLoaded(row.user_id, true);
          setNotesOpenFor(row);
          setModalNoteDraft('');
        },
        listMissionRingProofAttachments,
        uploadMissionRingProofAttachment,
      }),
    [
      handleToggle,
      handlePatchField,
      handleSaveAndAddProduction,
      savingKeySet,
      notesByUserId,
      noteDraftByUserId,
      focusedNoteInputId,
      savingNoteUserIdSet,
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
        { label: '', colSpan: 4, className: 'group-empty' },
        { label: 'PHILOSOPHY', colSpan: 3, className: 'group-main' },
        { label: 'SYSTEM', colSpan: 10, className: 'group-main' },
      ],
      [
        { label: '', colSpan: 4, className: 'group-empty' },
        { label: 'MULTI HANDED', colSpan: 1, className: 'group-sub' },
        { label: '10% 3 RULES 3 GOALS', colSpan: 1, className: 'group-sub' },
        { label: 'SELF IMPROVEMENT', colSpan: 1, className: 'group-sub' },
        { label: 'MISSION', colSpan: 10, className: 'group-sub' },
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

        const query: MissionTrackerQuery = {
          page: pageNum,
          pageSize,
          sort: toSortParam(nextSort),
          segment: toSegmentParam(teamScope),
          filters: toBackendFilters(nextFilters),
        };

        const data = await fetchMissionTracker(query);
        const serialStart = (pageNum - 1) * pageSize;
        const rowsWithSerial = data.results.map((row, index) => ({
          ...row,
          serial_no: serialStart + index + 1,
        }));

        setTotalCount(data.count || 0);
        setHasMore(Boolean(data.next));
        setNextPageNum(pageNum + 1);
        if (isInitial) {
          setRows(rowsWithSerial);
        } else {
          setRows((prev) => [...prev, ...rowsWithSerial]);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load mission tracker';
        if (isInitial) setError(message);
        addToast({ type: 'error', message: 'Failed to load mission tracker.' });
      } finally {
        if (isInitial) {
          hasLoadedOnceRef.current = true;
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [addToast, teamScope]
  );

  useEffect(() => {
    if (shouldDeferTeamScopeFetch(teamScope, teamScopeUserId)) {
      setError(null);
      hasLoadedOnceRef.current = true;
      setLoading(false);
      setLoadingMore(false);
      return;
    }
    void loadRows(1, true, sortState, filters);
  }, [filters, loadRows, sortState, teamScope, teamScopeUserId]);

  const handleReachEnd = useCallback(() => {
    if (shouldDeferTeamScopeFetch(teamScope, teamScopeUserId)) {
      return;
    }
    if (hasMore && !loadingMore && !loading && rows.length > 0) {
      void loadRows(nextPageNum, false, sortState, filters);
    }
  }, [filters, hasMore, loadRows, loading, loadingMore, nextPageNum, rows.length, sortState, teamScope, teamScopeUserId]);

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
          title="Loading mission tracker"
          description="Fetching mission tracker records..."
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
          title="Error Loading Mission Tracker"
          description={error}
          retryLabel="Retry"
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-2">
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
          </div>
        }
      />

      <div className="flex-1 overflow-hidden">
        <TrackerTable
          columns={columns}
          rows={rows}
          rowKey={(row, index) => `${row.id}-${index}`}
          headerGroupRows={headerGroupRows}
          stickyFirstNColumns={4}
          resizable
          tableId="mission-tracker"
          emptyMessage="No mission tracker records found."
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
            <div className="text-sm text-slate-400 dark:text-white/60">Loading more mission records...</div>
          </div>
        )}
        {/* {!hasMore && rows.length > 0 && (
          <div className="flex items-center justify-center py-4">
            <div className="text-sm text-slate-400 dark:text-white/60">No more records to load</div>
          </div>
        )} */}
      </div>

      <AddProductionModal
        open={Boolean(addProductionRow)}
        saving={savingProduction}
        prospect={null}
        title="Add to Production"
        submitLabel="Save and Add to Production"
        initialForm={addProductionInitialForm}
        companyOptions={productionCompanyOptions}
        productsByCompany={productionProductsByCompany}
        splitOptions={productionSplitOptions}
        multiplierTable={productionMultiplierTable}
        onClose={() => {
          setAddProductionRow(null);
          setAddProductionInitialForm(null);
        }}
        onSubmit={handleAddProductionSubmit}
      />

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
    </div>
  );
}
