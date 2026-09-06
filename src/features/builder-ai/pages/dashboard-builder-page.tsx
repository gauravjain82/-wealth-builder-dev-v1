/**
 * BuilderDashboardBuilderPage — the in-app dashboard builder (Phase 4, spec §44).
 *
 * Staff-facing editor that lets managers assemble a program's dashboards from
 * sections and widgets by drag-drop — the visual alternative to Django admin /
 * `PATCH /api/builder/config/*` (Decision 11). All writes require
 * `builder_dashboard:manage`; the backend enforces this and 403s otherwise, so a
 * viewer without access sees a clear empty state rather than a broken editor.
 *
 * This page owns dashboard selection + identity CRUD; the drag-drop canvas lives in
 * `DashboardBuilder`. Layout changes here are reflected on the live Home/Company/
 * BaseShop pages, which read the same config (Decision 10).
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, ErrorState, LoadingState, NonIdealState, Select } from '@shared/components';
import { ExternalLink, LayoutDashboard, Pencil, Plus } from 'lucide-react';
import { useToastStore } from '@/store';
import { usePrograms } from '../hooks/use-builder-ai';
import { useDashboardBuilderMutations, useDashboards } from '../hooks/use-builder-config';
import { DashboardBuilder } from '../components/builder/dashboard-builder';
import {
  DashboardEditorModal,
  type DashboardDraft,
} from '../components/builder/dashboard-editor-modal';
import type { DashboardConfig, Segment } from '../types';

/**
 * Map a dashboard's default segment to the live read page + tier. One dashboard now
 * (Decision 31), so every segment deep-links to the same page with a `?scope=` tier.
 */
const LIVE_ROUTE: Partial<Record<Segment, string>> = {
  INDIVIDUAL: '/builder-ai/dashboard?scope=individual',
  BASESHOP: '/builder-ai/dashboard?scope=baseshop',
  SUPERBASE: '/builder-ai/dashboard?scope=superbase',
  SUPERTEAM: '/builder-ai/dashboard?scope=superteam',
};

/** Render the dashboard builder page. */
export default function BuilderDashboardBuilderPage() {
  const addToast = useToastStore((s) => s.addToast);
  const programsQuery = usePrograms();
  const program = programsQuery.data?.[0];
  const dashboardsQuery = useDashboards(program?.id);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<DashboardConfig | null>(null);

  // Default to the first dashboard once the list loads.
  useEffect(() => {
    if (dashboardsQuery.data && dashboardsQuery.data.length > 0 && selectedId == null) {
      setSelectedId(dashboardsQuery.data[0].id);
    }
  }, [dashboardsQuery.data, selectedId]);

  const selected = useMemo(
    () => dashboardsQuery.data?.find((d) => d.id === selectedId) ?? null,
    [dashboardsQuery.data, selectedId],
  );

  const m = useDashboardBuilderMutations(selectedId ?? undefined);
  const savingDashboard = m.createDashboard.isPending || m.updateDashboard.isPending;

  const submitDashboard = async (draft: DashboardDraft) => {
    try {
      if (editing) {
        await m.updateDashboard.mutateAsync({
          id: editing.id,
          payload: { name: draft.name, default_scope: draft.default_scope },
        });
      } else {
        const created = await m.createDashboard.mutateAsync({
          program: program?.id,
          name: draft.name,
          code: draft.code,
          default_scope: draft.default_scope,
        });
        setSelectedId(created.id);
      }
      setEditorOpen(false);
      setEditing(null);
    } catch (err) {
      addToast({ type: 'error', message: (err as Error)?.message ?? 'Save failed.' });
    }
  };

  if (programsQuery.isLoading || dashboardsQuery.isLoading) {
    return <LoadingState pageHeading="Dashboard builder" title="Loading" description="Fetching dashboards…" />;
  }

  // A viewer without `builder_dashboard:read/manage` gets 403 on the config list.
  if (dashboardsQuery.isError) {
    return (
      <ErrorState
        pageHeading="Dashboard builder"
        description="You do not have access to edit dashboards for this program."
        onRetry={() => dashboardsQuery.refetch()}
      />
    );
  }

  const liveRoute = selected ? LIVE_ROUTE[selected.default_scope] : undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
            <LayoutDashboard size={20} /> Dashboard builder
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-white/60">
            Arrange sections and widgets by drag-drop. Changes apply to the live pages.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(dashboardsQuery.data?.length ?? 0) > 0 && (
            <Select
              variant="surface"
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(Number(e.target.value))}
              className="w-48"
            >
              {dashboardsQuery.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          )}
          {selected && (
            <Button
              variant="outline"
              onClick={() => {
                setEditing(selected);
                setEditorOpen(true);
              }}
            >
              <Pencil size={15} /> Rename
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            <Plus size={16} /> New dashboard
          </Button>
          {liveRoute && (
            <Link to={liveRoute}>
              <Button variant="ghost">
                <ExternalLink size={15} /> View live
              </Button>
            </Link>
          )}
        </div>
      </div>

      {selected ? (
        <DashboardBuilder key={selected.id} dashboard={selected} />
      ) : (
        <NonIdealState
          title="No dashboards yet"
          description="Create your first dashboard to start adding sections and widgets."
          actionLabel="New dashboard"
          onAction={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
        />
      )}

      <DashboardEditorModal
        open={editorOpen}
        dashboard={editing}
        isSaving={savingDashboard}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSubmit={submitDashboard}
      />
    </div>
  );
}
