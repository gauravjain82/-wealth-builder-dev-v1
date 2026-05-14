import { useCallback, useEffect, useMemo, useState } from 'react';
import { Block, ErrorState, LoadingState, TrackerDateRangeFilter, type DatePresetKey, type TrackerDateRangeChange, TrackerTable } from '@/shared/components';
import { useToastStore } from '@/store';
import { buildProductionColumns } from '../production-columns';
import {
  deleteProductionRecord,
  fetchProductionTracker,
  type ProductionTrackerQuery,
  type ProductionTrackerRecord,
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

export default function ProductionTrackerPage() {
  const pageHeading = 'Production Tracker';
  const pageDescription = "Monitor your team's production and revenue";

  const [rows, setRows] = useState<ProductionTrackerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<ProductionTrackerRecord | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [sortState, setSortState] = useState<{ key: string; direction: SortDirection } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dateRangePreset, setDateRangePreset] = useState<DatePresetKey>('all');
  const [teamScope, setTeamScope] = useState<TrackerTeamScope>('baseshop');
  const [teamScopeUserId, setTeamScopeUserId] = useState<string | null>(null);
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

  const updateRowInState = (updated: ProductionTrackerRecord) => {
    setRows((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handlePatchRow = async (
    row: ProductionTrackerRecord,
    patch: UpdateProductionPayload
  ) => {
    try {
      const updated = await updateProductionRecord(row.id, patch);
      updateRowInState(updated);
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update production record.',
      });
    }
  };

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
      const target = form.targetPoints ? Number(form.targetPoints) : 0;
      const pointsForty = target ? Number((target * 0.4).toFixed(2)) : null;
      const pointsSixty = target ? Number((target * 0.6).toFixed(2)) : null;

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
        points_forty: pointsForty,
        points_sixty: pointsSixty,
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

  const columns = useMemo(
    () =>
      buildProductionColumns({
        onPatch: handlePatchRow,
        onEdit: (row) => setEditingRow(row),
        onDelete: handleDeleteRow,
      }),
    []
  );

  useEffect(() => {
    let isMounted = true;

    const loadRows = async () => {
      try {
        setLoading(true);
        setError(null);
        const query: ProductionTrackerQuery = {
          sort: toSortParam(sortState),
          filters: toBackendFilters(filters),
        };
        const data = await fetchProductionTracker(query);
        if (isMounted) {
          setRows(data);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load production tracker records';
        if (isMounted) {
          setError(message);
        }
        addToast({ type: 'error', message: 'Failed to load production tracker records.' });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRows();

    return () => {
      isMounted = false;
    };
  }, [addToast, sortState, filters]);

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
    <div className="flex h-screen flex-col p-2">
      <Block
        title={pageHeading}
        description={`${pageDescription} • ${rows.length} total`}
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
        />
      </div>

      <AddProductionModal
        open={Boolean(editingRow)}
        saving={savingEdit}
        prospect={null}
        title="Edit Production"
        submitLabel="Save Changes"
        initialForm={editingRow ? toEditForm(editingRow) : null}
        onClose={() => setEditingRow(null)}
        onSubmit={handleSaveEdit}
      />
    </div>
  );
}
