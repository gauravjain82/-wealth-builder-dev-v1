import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconInfoCircle } from '@tabler/icons-react';
import { ErrorState, LoadingState, TrackerDateRangeFilter, type DatePresetKey, type TrackerDateRangeChange, TrackerTable } from '@/shared/components';
import { TrackerNotesModal } from '@/features/team/components/tracker-notes-modal';
import type { TrackerNote } from '@/features/team/services/tracker-notes-service';
import { createTrackerNote, fetchTrackerNotesForUser } from '@/features/team/services/tracker-notes-service';
import { useToastStore } from '@/store';
import { buildProductionColumns } from '../production-columns';
import {
  deleteProductionRecord,
  fetchProductionCompanyProducts,
  fetchProductionPointsSummary,
  fetchProductionSplitPresets,
  fetchProductionTopPerformers,
  fetchProductionTracker,
  recordPolicyAdvance,
  recordPolicyChargeback,
  type ProductionCompanyProduct,
  type ProductionPointsSummary,
  type ProductionTrackerQuery,
  type ProductionTrackerRecord,
  type ProductionTopPerformer,
  type UpdateProductionPayload,
  updateProductionRecord,
} from '../services/production-tracker-service';
import {
  AddProductionModal,
  type AddProductionFormData,
} from '@/features/team/prospect/components/add-production-modal';
import { TrackerTeamScopeFilter, type TrackerTeamScope } from '@/features/team/components/tracker-team-scope-filter';

type SortDirection = 'asc' | 'desc';

function toSortParam(sort: { key: string; direction: SortDirection } | null): string | undefined {
  if (!sort) return undefined;
  return sort.direction === 'desc' ? `-${sort.key}` : sort.key;
}

function toBackendFilters(filters: Record<string, string>): Record<string, string> {
  return Object.entries(filters).reduce<Record<string, string>>((acc, [key, value]) => {
    const normalized = value.trim();
    if (!normalized) return acc;
    acc[key] = normalized;
    return acc;
  }, {});
}

function getCurrentUserId(): number | null {
  const raw = localStorage.getItem('wb.userId');
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseMetricNumber(value: number | string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMetricNumber(value: number, digits = 2): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function deriveAdvancePercentage(row: ProductionTrackerRecord, type: 'FIRST' | 'SECOND'): string {
  const total = parseMetricNumber(row.points_target);
  const part = type === 'FIRST' ? parseMetricNumber(row.points_forty) : parseMetricNumber(row.points_sixty);

  if (total > 0 && part > 0) {
    return ((part / total) * 100).toFixed(2);
  }
  return type === 'FIRST' ? '40.00' : '60.00';
}

function summaryToKpis(summary: ProductionPointsSummary | null, topPerformerName: string | null) {
  if (!summary) {
    return {
      baseshop: formatMetricNumber(0),
      baseshopProj: formatMetricNumber(0),
      personal: formatMetricNumber(0),
      personalProj: formatMetricNumber(0),
      chargebacks: formatMetricNumber(0),
      npr: '0.0%',
      topProducer: topPerformerName || '—',
    };
  }

  return {
    baseshop: formatMetricNumber(parseMetricNumber(summary.baseshop.advance)),
    baseshopProj: formatMetricNumber(parseMetricNumber(summary.baseshop.projected)),
    personal: formatMetricNumber(parseMetricNumber(summary.personal.advance)),
    personalProj: formatMetricNumber(parseMetricNumber(summary.personal.projected)),
    chargebacks: formatMetricNumber(Math.abs(parseMetricNumber(summary.baseshop.chargeback))),
    npr: `${parseMetricNumber(summary.npr).toFixed(1)}%`,
    topProducer: topPerformerName || '—',
  };
}

function mergeCompanyProducts(companyProducts: ProductionCompanyProduct[]) {
  const nextProductsByCompany: Record<string, string[]> = {};
  const multiplierTable: Record<string, number> = {};

  companyProducts.forEach((item) => {
    if (!nextProductsByCompany[item.company_name]) {
      nextProductsByCompany[item.company_name] = [];
    }
    if (!nextProductsByCompany[item.company_name].includes(item.product_name)) {
      nextProductsByCompany[item.company_name] = [...nextProductsByCompany[item.company_name], item.product_name];
    }
    multiplierTable[`${item.company_name}|${item.product_name}`] = parseMetricNumber(item.multiplier) || 1;
  });

  const companyOptions = Array.from(new Set(companyProducts.map((item) => item.company_name)));

  return {
    companyOptions,
    productsByCompany: nextProductsByCompany,
    multiplierTable,
  };
}

function mergeSplitOptions(presets: Array<{ splits: number[] }>) {
  const presetOptions = presets
    .map((preset) => (preset.splits.length === 1 ? `${preset.splits[0]}` : `${preset.splits[0]}/${preset.splits[1]}`))
    .filter(Boolean);

  return Array.from(new Set(presetOptions));
}

function deriveCompanyConfigFromRows(rows: ProductionTrackerRecord[]) {
  const productsByCompany: Record<string, string[]> = {};
  const multiplierTable: Record<string, number> = {};

  rows.forEach((row) => {
    const company = (row.policy_company || '').trim();
    if (!company) return;

    const product = (row.policy_product || row.policy_other_product || '').trim();

    if (!productsByCompany[company]) {
      productsByCompany[company] = [];
    }
    if (product && !productsByCompany[company].includes(product)) {
      productsByCompany[company] = [...productsByCompany[company], product];
    }

    const pointsTarget = parseMetricNumber(row.points_target);
    const basePoints = pointsTarget > 0 ? pointsTarget : 0;
    if (basePoints > 0 && product) {
      multiplierTable[`${company}|${product}`] = 1;
    }
  });

  return {
    companyOptions: Object.keys(productsByCompany),
    productsByCompany,
    multiplierTable,
  };
}

function KpiCard({
  label,
  value,
  info,
}: {
  label: string;
  value: string;
  info: string;
}) {
  return (
    <div className="rounded-xl border border-[#6d5930] bg-[linear-gradient(135deg,rgba(64,49,16,0.9),rgba(43,32,9,0.92))] px-3 py-4 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#f7f0d3]">
        <span>{label}</span>
        <span title={info} className="cursor-help text-[#ddc67a]">
          <IconInfoCircle size={12} stroke={2} />
        </span>
      </div>
      <div className="mt-2 text-lg font-extrabold text-white">{value}</div>
    </div>
  );
}

export default function ProductionTrackerPage() {
  const pageHeading = 'Production Tracker';
  const pageDescription = "Monitor your team's production and revenue";

  const [rows, setRows] = useState<ProductionTrackerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextPageNum, setNextPageNum] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<ProductionTrackerRecord | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [notesByUserId, setNotesByUserId] = useState<Record<number, TrackerNote[]>>({});
  const [loadingNoteUserIdSet, setLoadingNoteUserIdSet] = useState<Set<number>>(new Set());
  const [noteDraftByUserId, setNoteDraftByUserId] = useState<Record<number, string>>({});
  const [focusedNoteInputId, setFocusedNoteInputId] = useState<number | null>(null);
  const [savingNoteUserIdSet, setSavingNoteUserIdSet] = useState<Set<number>>(new Set());
  const [notesOpenFor, setNotesOpenFor] = useState<ProductionTrackerRecord | null>(null);
  const [modalNoteDraft, setModalNoteDraft] = useState('');
  const [sortState, setSortState] = useState<{ key: string; direction: SortDirection } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dateRangePreset, setDateRangePreset] = useState<DatePresetKey>('all');
  const [teamScope, setTeamScope] = useState<TrackerTeamScope>('baseshop');
  const [teamScopeUserId, setTeamScopeUserId] = useState<string | null>(null);
  const [pointsSummary, setPointsSummary] = useState<ProductionPointsSummary | null>(null);
  const [topPerformers, setTopPerformers] = useState<ProductionTopPerformer[]>([]);
  const [companyProducts, setCompanyProducts] = useState<ProductionCompanyProduct[]>([]);
  const [splitOptions, setSplitOptions] = useState<string[]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const pageSize = 10;
  const addToast = useToastStore((state) => state.addToast);
  const currentUserId = useMemo(() => getCurrentUserId(), []);

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

  const updateRowInState = (updated: ProductionTrackerRecord) => {
    setRows((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleNoteDraftChange = useCallback((userId: number, value: string) => {
    setNoteDraftByUserId((prev) => ({ ...prev, [userId]: value }));
  }, []);

  const ensureNotesLoaded = useCallback(async (userId: number) => {
    if (Object.prototype.hasOwnProperty.call(notesByUserId, userId) || loadingNoteUserIdSet.has(userId)) {
      return;
    }

    setLoadingNoteUserIdSet((prev) => {
      if (prev.has(userId)) return prev;
      const next = new Set(prev);
      next.add(userId);
      return next;
    });

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
  }, [addToast, loadingNoteUserIdSet, notesByUserId]);

  const handleAddInlineNote = useCallback(async (userId: number) => {
    const draft = (noteDraftByUserId[userId] || '').trim();
    if (!draft) return;

    setSavingNoteUserIdSet((prev) => new Set(prev).add(userId));
    try {
      const created = await createTrackerNote(userId, draft, 'production');
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
  }, [addToast, noteDraftByUserId]);

  const handleAddModalNote = useCallback(async () => {
    if (!notesOpenFor?.prospect) return;

    const text = modalNoteDraft.trim();
    if (!text) return;

    const userId = notesOpenFor.prospect;
    setSavingNoteUserIdSet((prev) => new Set(prev).add(userId));
    try {
      const created = await createTrackerNote(userId, text, 'production');
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
  }, [addToast, modalNoteDraft, notesOpenFor]);

  const handlePatchRow = async (
    row: ProductionTrackerRecord,
    patch: UpdateProductionPayload
  ) => {
    try {
      const isFirstAdvanceUpdate = Object.prototype.hasOwnProperty.call(patch, 'advance_first_date');
      const isSecondAdvanceUpdate = Object.prototype.hasOwnProperty.call(patch, 'advance_second_date');

      if (isFirstAdvanceUpdate || isSecondAdvanceUpdate) {
        if (isFirstAdvanceUpdate) {
          const paidDate = patch.advance_first_date;
          if (!paidDate) {
            throw new Error('Removing first advance date is not supported.');
          }
          await recordPolicyAdvance(row.id, {
            advance_type: 'FIRST',
            percentage: deriveAdvancePercentage(row, 'FIRST'),
            paid_date: paidDate,
          });
        }

        if (isSecondAdvanceUpdate) {
          const paidDate = patch.advance_second_date;
          if (!paidDate) {
            throw new Error('Removing second advance date is not supported.');
          }
          await recordPolicyAdvance(row.id, {
            advance_type: 'SECOND',
            percentage: deriveAdvancePercentage(row, 'SECOND'),
            paid_date: paidDate,
          });
        }

        const query: ProductionTrackerQuery = {
          page: 1,
          pageSize,
          sort: toSortParam(sortState),
          filters: toBackendFilters(filters),
        };
        const summaryUserId = teamScopeUserId ? Number(teamScopeUserId) : currentUserId;
        const shouldRefreshTopPerformers = !hasDateFilter && !teamScopeUserId;

        const [refreshed, refreshedSummary, refreshedTopPerformers] = await Promise.all([
          fetchProductionTracker(query),
          fetchProductionPointsSummary(summaryUserId),
          shouldRefreshTopPerformers ? fetchProductionTopPerformers() : Promise.resolve(null),
        ]);

        setRows(refreshed.results);
        setTotalCount(refreshed.count || 0);
        setHasMore(Boolean(refreshed.next));
        setNextPageNum(2);
        setPointsSummary(refreshedSummary);
        if (shouldRefreshTopPerformers) {
          setTopPerformers(refreshedTopPerformers ?? []);
        }
        return;
      }

      const updated = await updateProductionRecord(row.id, patch);
      updateRowInState(updated);
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update production record.',
      });
    }
  };

  const handleChargeback = useCallback(async (row: ProductionTrackerRecord, chargebackDate: string) => {
    try {
      await recordPolicyChargeback(row.id, chargebackDate);
      // Optimistically mark the row as chargeback
      updateRowInState({ ...row, chargeback: true, status: 'Chargeback' });
      addToast({ type: 'success', message: 'Chargeback recorded.' });
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to record chargeback.',
      });
    }
  }, [addToast]);

  const handleDeleteRow = async (row: ProductionTrackerRecord) => {
    const confirmed = window.confirm(`Delete production record for ${row.client_name || 'this client'}?`);
    if (!confirmed) return;

    try {
      await deleteProductionRecord(row.id);
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      addToast({ type: 'success', message: 'Production record deleted.' });
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to delete production record.',
      });
    }
  };

  const toEditForm = (row: ProductionTrackerRecord): AddProductionFormData => {
    const isSplit = row.split_mode === 'split';
    const split = isSplit ? `${row.agent_1_pct || 50}/${row.agent_2_pct || 50}` : '100/0';
    return {
      status: row.status || 'Pending',
      dateWritten: row.date_written || '',
      closureDate: row.closure_date || '',
      client: row.client_name || '',
      agentMode: isSplit ? 'split' : 'single',
      agent1Id: row.agent_1,
      agent1Name: row.agent_1_name || '',
      agent2Id: row.agent_2,
      agent2Name: row.agent_2_name || '',
      agent1Pct: row.agent_1_pct || (isSplit ? 50 : 100),
      agent2Pct: row.agent_2_pct || (isSplit ? 50 : 0),
      split,
      targetPoints: row.points_target !== null && row.points_target !== undefined ? String(row.points_target) : '',
      multiplierPercent: '',
      company: row.policy_company || '',
      product: row.policy_product || '',
      otherProduct: row.policy_other_product || '',
      policyNumber: row.policy_number || '',
      delivery: row.delivery || 'Pending',
      trialApp: Boolean(row.trial_app),
      notes: row.notes || '',
    };
  };

  const handleSaveEdit = async (form: AddProductionFormData) => {
    if (!editingRow) return;
    setSavingEdit(true);
    try {
      const updated = await updateProductionRecord(editingRow.id, {
        status: form.status,
        date_written: form.dateWritten || null,
        closure_date: form.closureDate || null,
        client_name: form.client,
        delivery: form.delivery,
        notes: form.notes,
        trial_app: form.trialApp,
        policy_company: form.company,
        policy_number: form.policyNumber,
        policy_product: form.product === 'OTHER' ? form.otherProduct : form.product,
        policy_other_product: form.product === 'OTHER' ? form.otherProduct : '',
        points_target: form.targetPoints ? Number(form.targetPoints) : null,
        agent_1: form.agent1Id,
        agent_1_name: form.agent1Name,
        agent_1_pct: form.agent1Pct,
        agent_2: form.agentMode === 'split' ? form.agent2Id : null,
        agent_2_name: form.agentMode === 'split' ? form.agent2Name : '',
        agent_2_pct: form.agentMode === 'split' ? form.agent2Pct : 0,
        split_mode: form.agentMode === 'split' ? 'split' : 'solo',
      });

      updateRowInState(updated);
      setEditingRow(null);
      addToast({ type: 'success', message: 'Production record updated.' });
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update production record.',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const apiProductConfig = useMemo(() => mergeCompanyProducts(companyProducts), [companyProducts]);
  const rowProductConfig = useMemo(() => deriveCompanyConfigFromRows(rows), [rows]);
  const mergedProductConfig = useMemo(() => {
    if (apiProductConfig.companyOptions.length > 0) {
      return apiProductConfig;
    }
    return rowProductConfig;
  }, [apiProductConfig, rowProductConfig]);

  const columns = useMemo(
    () =>
      buildProductionColumns({
        onPatch: handlePatchRow,
        onEdit: (row) => setEditingRow(row),
        onDelete: handleDeleteRow,
        notesByUserId,
        noteDraftByUserId,
        focusedNoteInputId,
        savingNoteUserIdSet,
        onNoteDraftChange: handleNoteDraftChange,
        onNoteFocus: setFocusedNoteInputId,
        onNoteBlur: () => setFocusedNoteInputId(null),
        onAddInlineNote: handleAddInlineNote,
        onOpenAllNotes: (row) => {
          if (!row.prospect) {
            addToast({ type: 'error', message: 'This policy is not linked to a user yet.' });
            return;
          }
          void ensureNotesLoaded(row.prospect);
          setNotesOpenFor(row);
          setModalNoteDraft('');
        },
        onChargeback: handleChargeback,
        splitOptions,
        companyOptions: mergedProductConfig.companyOptions,
        productsByCompany: mergedProductConfig.productsByCompany,
      }),
    [
      addToast,
      ensureNotesLoaded,
      focusedNoteInputId,
      handleAddInlineNote,
      handleDeleteRow,
      handleNoteDraftChange,
      mergedProductConfig.companyOptions,
      mergedProductConfig.productsByCompany,
      noteDraftByUserId,
      notesByUserId,
      savingNoteUserIdSet,
      splitOptions,
      handleChargeback,
    ]
  );
  const hasDateFilter = Boolean(filters.from_date || filters.to_date);

  const displayedKpis = useMemo(
    () => summaryToKpis(pointsSummary, topPerformers[0]?.user_name || null),
    [pointsSummary, topPerformers]
  );

  const notesForOpenUser = useMemo(() => {
    if (!notesOpenFor?.prospect) return [];
    const notes = notesByUserId[notesOpenFor.prospect] || [];
    return [...notes].sort((a, b) => {
      const at = new Date(a.created_at).getTime();
      const bt = new Date(b.created_at).getTime();
      return at - bt;
    });
  }, [notesByUserId, notesOpenFor]);

  const rowStyle = useCallback((row: ProductionTrackerRecord) => {
    const status = (row.status || '').trim().toLowerCase();
    if (status === 'complete') {
      return {
        background: 'rgba(20, 81, 49, 0.92)',
      };
    }
    if (status === 'chargeback') {
      return {
        background: 'rgba(92, 33, 33, 0.82)',
      };
    }
    if (status === 'trial') {
      return {
        background: 'rgba(78, 63, 18, 0.82)',
      };
    }
    return undefined;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadProductionUiOptions = async () => {
      try {
        const [productData, presetData] = await Promise.all([
          fetchProductionCompanyProducts(),
          fetchProductionSplitPresets(),
        ]);

        if (!isMounted) return;
        setCompanyProducts(productData);
        setSplitOptions(mergeSplitOptions(presetData));
      } catch (err) {
        if (!isMounted) return;
        addToast({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to load production tracker configuration.',
        });
      }
    };

    void loadProductionUiOptions();

    return () => {
      isMounted = false;
    };
  }, [addToast]);

  useEffect(() => {
    let isMounted = true;

    const loadSummary = async () => {
      try {
        const summary = await fetchProductionPointsSummary(teamScopeUserId ? Number(teamScopeUserId) : currentUserId);
        if (isMounted) {
          setPointsSummary(summary);
        }
      } catch {
        if (isMounted) {
          setPointsSummary(null);
        }
      }
    };

    void loadSummary();

    return () => {
      isMounted = false;
    };
  }, [currentUserId, teamScopeUserId]);

  useEffect(() => {
    let isMounted = true;

    const loadTopPerformers = async () => {
      if (hasDateFilter || teamScopeUserId) {
        setTopPerformers([]);
        return;
      }

      try {
        const data = await fetchProductionTopPerformers();
        if (isMounted) {
          setTopPerformers(data);
        }
      } catch {
        if (isMounted) {
          setTopPerformers([]);
        }
      }
    };

    void loadTopPerformers();

    return () => {
      isMounted = false;
    };
  }, [hasDateFilter, teamScopeUserId]);

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

        const query: ProductionTrackerQuery = {
          page: pageNum,
          pageSize,
          sort: toSortParam(nextSort),
          filters: toBackendFilters(nextFilters),
        };

        const data = await fetchProductionTracker(query);
        setTotalCount(data.count || 0);
        setHasMore(Boolean(data.next));
        setNextPageNum(pageNum + 1);

        if (isInitial) {
          setRows(data.results);
        } else {
          setRows((prev) => [...prev, ...data.results]);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load production tracker records';
        if (isInitial) {
          setError(message);
        }
        addToast({ type: 'error', message: 'Failed to load production tracker records.' });
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

  if (loading) {
    return (
      <div className="p-2">
        <LoadingState
          pageHeading={pageHeading}
          pageDescription={pageDescription}
          title="Loading production tracker"
          description="Fetching production records..."
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
          title="Error Loading Production Tracker"
          description={error}
          retryLabel="Retry"
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col gap-3 bg-[#111318] p-2 text-white">
      <div className="rounded-2xl border border-white/10 bg-[#1d2027] px-4 py-5 shadow-[0_20px_45px_rgba(0,0,0,0.28)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-white">{pageHeading}</h1>
            <p className="mt-1 text-sm text-white/60">{pageDescription}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TrackerDateRangeFilter
              value={dateRangePreset}
              selectedRange={selectedDateRange}
              onChange={handleDateRangeChange}
            />
            <TrackerTeamScopeFilter
              value={teamScope}
              selectedUserId={teamScopeUserId}
              onChange={handleTeamScopeChange}
            />
          </div>
        </div>

        {/* <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 rounded-2xl border border-[#806726] bg-[linear-gradient(135deg,rgba(65,50,15,0.94),rgba(42,31,8,0.94))] px-4 py-3 shadow-[0_10px_25px_rgba(0,0,0,0.25)]">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#473a15] text-[#d9be67]">
              <IconUsers size={20} stroke={1.8} />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#d7c58a]">Families Helped</div>
              <div className="text-2xl font-extrabold text-[#ffe59a]">{rows.length}</div>
            </div>
          </div>
        </div> */}
      </div>

      <div className="grid flex-shrink-0 grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-8">
        <KpiCard label="Families Helped" value={totalCount.toString()} info="" />
        <KpiCard label="Baseshop Points" value={displayedKpis.baseshop} info="Direct points written and issued." />
        <KpiCard label="Baseshop Projected Points" value={displayedKpis.baseshopProj} info="Baseshop points submitted but not fully issued yet." />
        <KpiCard label="Personal Points" value={displayedKpis.personal} info="Your direct written and issued points." />
        <KpiCard label="Personal Projected Points" value={displayedKpis.personalProj} info="Your submitted points that are not fully issued yet." />
        <KpiCard label="Chargebacks" value={displayedKpis.chargebacks} info="Business that was declined, cancelled, or lapsed." />
        <KpiCard label="NPR" value={displayedKpis.npr} info="Net point ratio equals net issued points divided by gross submitted points." />
        <KpiCard label="Top Producer" value={displayedKpis.topProducer} info="Highest net point producer in the current baseshop view." />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-[#3c3521] bg-[#171a20] p-2 shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
        <TrackerTable
          columns={columns}
          rows={rows}
          rowKey={(row) => String(row.id)}
          stickyFirstNColumns={4}
          resizable
          tableId="production-tracker"
          emptyMessage="No production records found."
          className="h-full"
          serverSort={sortState}
          onServerSortChange={setSortState}
          serverFilters={filters}
          onServerFilterChange={setFilters}
          rowStyle={rowStyle}
        />
      </div>

      <div ref={sentinelRef} className="flex-shrink-0">
        {loadingMore && (
          <div className="flex items-center justify-center py-3">
            <div className="text-sm text-white/60">Loading more production records...</div>
          </div>
        )}
      </div>

      <AddProductionModal
        open={Boolean(editingRow)}
        saving={savingEdit}
        prospect={null}
        title="Edit Production"
        submitLabel="Save Changes"
        initialForm={editingRow ? toEditForm(editingRow) : null}
        companyOptions={mergedProductConfig.companyOptions}
        productsByCompany={mergedProductConfig.productsByCompany}
        splitOptions={splitOptions.filter((option) => option !== '100/0')}
        multiplierTable={mergedProductConfig.multiplierTable}
        onClose={() => setEditingRow(null)}
        onSubmit={handleSaveEdit}
      />

      <TrackerNotesModal
        open={Boolean(notesOpenFor)}
        title={`Notes - ${notesOpenFor?.client_name || ''}`}
        notes={notesForOpenUser}
        draft={modalNoteDraft}
        saving={Boolean(
          notesOpenFor?.prospect &&
          (savingNoteUserIdSet.has(notesOpenFor.prospect) || loadingNoteUserIdSet.has(notesOpenFor.prospect))
        )}
        onClose={() => setNotesOpenFor(null)}
        onDraftChange={setModalNoteDraft}
        onAddNote={handleAddModalNote}
      />
    </div>
  );
}
