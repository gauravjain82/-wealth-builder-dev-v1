import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Block, ErrorState, LoadingState, TrackerTable } from '@/shared/components';
import { useToastStore } from '@/store';
import { build4x4Columns } from '../tracker-4x4-columns';
import {
  fetch4x4Tracker,
  type Tracker4x4Record,
  type Tracker4x4Query,
  update4x4Tracker,
} from '../services/tracker-4x4-service';
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
import { createProductionRecord } from '@/features/team/production-tracker/services/production-tracker-service';
import type { SavingsToggleField, SavingsAmountField } from '../tracker-4x4-columns';

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
  const [addProductionRow, setAddProductionRow] = useState<Tracker4x4Record | null>(null);
  const [addProductionInitialForm, setAddProductionInitialForm] = useState<AddProductionFormData | null>(null);
  const [savingProduction, setSavingProduction] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextPageNum, setNextPageNum] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [sortState, setSortState] = useState<{ key: string; direction: SortDirection } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const sentinelRef = useRef<HTMLDivElement>(null);

  const pageSize = 10;
  const addToast = useToastStore((state) => state.addToast);

  const handlePatchField = async (
    userId: number,
    field: keyof Tracker4x4Record,
    value: number | string | boolean | null
  ) => {
    const savingKey = `${userId}:${String(field)}`;
    setSavingKeySet((prev) => new Set(prev).add(savingKey));
    try {
      const updated = await update4x4Tracker(userId, { [field]: value } as Partial<Tracker4x4Record>);
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

  const handleToggle = async (userId: number, field: keyof Tracker4x4Record, value: boolean) => {
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

  const handleSaveAndAddProduction = useCallback(
    (row: Tracker4x4Record, _savingsField: SavingsToggleField, _amountField: SavingsAmountField, amount: number) => {
      const today = new Date().toISOString().split('T')[0];

      // Prefill logged-in user as agent_1 from localStorage.
      let agent1Id: number | null = null;
      let agent1Name = '';
      try {
        const raw = localStorage.getItem('authUser');
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
      } catch {
        // Ignore malformed payload.
      }

      const form: AddProductionFormData = {
        status: 'Active',
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

        const MULTIPLIER_TABLE: Record<string, number> = {
          'TRANSAMERICA|FFIUL II': 1.25,
          'TRANSAMERICA|TERM LB - 10 YEARS': 1.10,
          'TRANSAMERICA|TERM LB - 15 YEARS': 1.16,
          'TRANSAMERICA|TERM LB - 20/25/30 YEARS': 1.26,
          'TRANSAMERICA|FINAL EXPENSE': 1.10,
          'NATIONWIDE|NEW HEIGHTS IUL ACCUMULATOR 2020': 1.09,
          'NORTH AMERICAN|SECURE HORIZON - CLIENT AGE 0-70': 0.062888,
          'NORTH AMERICAN|SECURE HORIZON - CLIENT AGE 71-75': 0.053496,
          'NORTH AMERICAN|SECURE HORIZON - CLIENT AGE 76+': 0.040919,
          'EVEREST|EVEREST': 1.0,
        };

        let multiplier = 1;
        if (data.company === 'OTHER' || data.product === 'OTHER') {
          const pct = parseFloat(data.multiplierPercent);
          multiplier = Number.isNaN(pct) ? 1 : pct;
        } else {
          multiplier = MULTIPLIER_TABLE[`${data.company}|${data.product}`] ?? 1;
        }

        const totalPoints = Math.round(base * multiplier * 100) / 100;

        await createProductionRecord({
          prospect: null,
          client_name: data.client,
          date_written: data.dateWritten || null,
          closure_date: data.closureDate || null,
          delivery: data.delivery,
          status: data.status,
          notes: data.notes,
          trial_app: data.trialApp,
          policy_company: data.company,
          policy_number: data.policyNumber,
          policy_product: data.product,
          policy_other_product: data.otherProduct,
          points_target: totalPoints,
          agent_1: data.agent1Id,
          agent_1_name: data.agent1Name,
          agent_1_pct: pA,
          agent_2: data.agentMode === 'split' ? data.agent2Id : null,
          agent_2_name: data.agentMode === 'split' ? data.agent2Name : '',
          agent_2_pct: pB,
          split_mode: data.agentMode === 'split' ? 'split' : 'solo',
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
    [addProductionRow, addToast]
  );

  const columns = useMemo(
    () =>
      build4x4Columns({
        onToggle: handleToggle,
        onPatch: handlePatchField,
        onSaveAndAddProduction: handleSaveAndAddProduction,
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
    [savingKeySet, notesByUserId, noteDraftByUserId, focusedNoteInputId, savingNoteUserIdSet, handleSaveAndAddProduction]
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

        const query: Tracker4x4Query = {
          page: pageNum,
          pageSize,
          sort: toSortParam(nextSort),
          filters: toBackendFilters(nextFilters),
        };

        const data = await fetch4x4Tracker(query);
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
        const message = err instanceof Error ? err.message : 'Failed to load 4x4 tracker';
        if (isInitial) setError(message);
        addToast({ type: 'error', message: 'Failed to load 4x4 tracker.' });
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
        description={`${pageDescription} • ${totalCount} total`}
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
          serverSort={sortState}
          onServerSortChange={setSortState}
          serverFilters={filters}
          onServerFilterChange={setFilters}
        />
      </div>

      <div ref={sentinelRef} className="mt-4 flex-shrink-0">
        {loadingMore && (
          <div className="flex items-center justify-center py-4">
            <div className="text-sm text-white/60">Loading more 4x4 records...</div>
          </div>
        )}
        {/* {!hasMore && rows.length > 0 && (
          <div className="flex items-center justify-center py-4">
            <div className="text-sm text-white/60">No more records to load</div>
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
    </div>
  );
}
