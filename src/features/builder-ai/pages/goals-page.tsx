/**
 * BuilderGoalsPage — create and edit per-level goal targets from the UI.
 *
 * A goal is a target for a metric, optionally scoped to a rank band. The backend
 * resolves which goal applies to a builder by precedence
 * `level + applies_at_or_above > exact level > program default` (builder/services/
 * goals.py) — so the same metric can carry a Company-Owner (SMD+) target and a lower
 * default. This page is the in-app alternative to Django admin / `PATCH
 * /api/builder/config/goals/` (Decision 11/16).
 *
 * Gated in the UI by `program.manage`; the backend still enforces `builder_goal:manage`
 * on every write and 403s otherwise (surfaced as an error state).
 */

import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Target, Trash2, X } from 'lucide-react';
import {
  Badge,
  Button,
  Checkbox,
  ErrorState,
  Input,
  LoadingState,
  NonIdealState,
  Select,
} from '@shared/components';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { useToastStore } from '@/store';
import { useMyBuilderAccess, usePrograms } from '../hooks/use-builder-ai';
import { useGoalMutations, useGoals, useLevels, useMetricDefinitions } from '../hooks/use-builder-config';
import { METRIC_PERIOD_TYPES } from '../types';
import type { GoalConfig, GoalWriteInput, Level, MetricDefinitionConfig } from '../types';

/** The editable shape of a goal in the form (band encodes level + applies_at_or_above). */
interface GoalDraft {
  metric: number | null;
  target: string;
  band: string;
  period_type: GoalConfig['period_type'];
  name: string;
  display_cap_100: boolean;
  is_active: boolean;
}

const NEW_DRAFT: GoalDraft = {
  metric: null,
  target: '',
  band: 'default',
  period_type: 'MONTHLY',
  name: '',
  display_cap_100: true,
  is_active: true,
};

/** Encode a (level, applies_at_or_above) pair as the band <select> value. */
function bandKey(level: number | null, atOrAbove: boolean): string {
  if (level == null) return 'default';
  return `${atOrAbove ? 'above' : 'exact'}:${level}`;
}

/** Decode a band <select> value back into level + applies_at_or_above. */
function parseBand(key: string): { level: number | null; atOrAbove: boolean } {
  if (key === 'default') return { level: null, atOrAbove: false };
  const [kind, id] = key.split(':');
  return { level: Number(id), atOrAbove: kind === 'above' };
}

/** Human label for a goal's band — reads the same way the backend resolver behaves. */
function bandLabel(level: number | null, atOrAbove: boolean, levels: Level[]): string {
  if (level == null) return 'Everyone (default)';
  const code = levels.find((l) => l.id === level)?.code ?? `#${level}`;
  return atOrAbove ? `${code} and above` : `Exactly ${code}`;
}

/** Stable slug for the auto-generated goal code (unique per program with the metric). */
function bandSlug(level: number | null, atOrAbove: boolean, levels: Level[]): string {
  if (level == null) return 'default';
  const code = levels.find((l) => l.id === level)?.code ?? String(level);
  return `${code.toLowerCase()}${atOrAbove ? '_plus' : ''}`;
}

/** Inline create/edit panel for a single goal. */
function GoalEditorPanel({
  open,
  goal,
  metrics,
  levels,
  isSaving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  goal: GoalConfig | null;
  metrics: MetricDefinitionConfig[];
  levels: Level[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (draft: GoalDraft) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<GoalDraft>(NEW_DRAFT);

  useEffect(() => {
    if (!open) return;
    setDraft(
      goal
        ? {
            metric: goal.metric,
            target: goal.target,
            band: bandKey(goal.level, goal.applies_at_or_above),
            period_type: goal.period_type,
            name: goal.name,
            display_cap_100: goal.display_cap_100,
            is_active: goal.is_active,
          }
        : { ...NEW_DRAFT, metric: metrics[0]?.id ?? null },
    );
  }, [open, goal, metrics]);

  if (!open) return null;

  const targetNum = Number(draft.target);
  const canSave = draft.metric != null && draft.target.trim() !== '' && !Number.isNaN(targetNum);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          {goal ? 'Edit goal' : 'New goal'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <X size={18} />
        </button>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/60">
              Metric
            </label>
            <Select
              value={draft.metric ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, metric: Number(e.target.value) }))}
            >
              {metrics.length === 0 && <option value="">No metrics</option>}
              {metrics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.code})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/60">
              Target
            </label>
            <Input
              type="number"
              value={draft.target}
              placeholder="e.g. 100"
              onChange={(e) => setDraft((d) => ({ ...d, target: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/60">
            Applies to
          </label>
          <Select
            value={draft.band}
            onChange={(e) => setDraft((d) => ({ ...d, band: e.target.value }))}
          >
            <option value="default">Everyone (default)</option>
            {levels.map((l) => (
              <Fragment key={l.id}>
                <option value={`above:${l.id}`}>{l.code} and above</option>
                <option value={`exact:${l.id}`}>Exactly {l.code}</option>
              </Fragment>
            ))}
          </Select>
          <p className="mt-1 text-xs text-slate-400">
            &ldquo;{'{level}'} and above&rdquo; is a rank band (e.g. SMD and above = Company
            Owners). Higher bands win over the default.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/60">
              Period
            </label>
            <Select
              value={draft.period_type}
              onChange={(e) =>
                setDraft((d) => ({ ...d, period_type: e.target.value as GoalDraft['period_type'] }))
              }
            >
              {METRIC_PERIOD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/60">
              Name <span className="text-slate-400">(optional)</span>
            </label>
            <Input
              value={draft.name}
              placeholder="Auto from metric + band"
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-white/70">
            <Checkbox
              checked={draft.display_cap_100}
              onChange={(e) => setDraft((d) => ({ ...d, display_cap_100: e.target.checked }))}
            />
            Cap rings/bars at 100%
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-white/70">
            <Checkbox
              checked={draft.is_active}
              onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
            />
            Active
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void onSubmit(draft)} disabled={!canSave || isSaving}>
            {isSaving ? 'Saving…' : goal ? 'Save' : 'Create goal'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Render the Builder AI Goals management page. */
export default function BuilderGoalsPage() {
  const addToast = useToastStore((s) => s.addToast);
  const access = useMyBuilderAccess();
  const canManage = Boolean(access.data?.program.manage);

  const programsQuery = usePrograms();
  const program = programsQuery.data?.[0];
  const goalsQuery = useGoals(program?.id);
  const metricsQuery = useMetricDefinitions(program?.id);
  const levelsQuery = useLevels();
  const mut = useGoalMutations(program?.id);
  const saving = mut.createGoal.isPending || mut.updateGoal.isPending;

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<GoalConfig | null>(null);
  const [deleting, setDeleting] = useState<GoalConfig | null>(null);

  const goals = useMemo(() => goalsQuery.data ?? [], [goalsQuery.data]);
  const metrics = useMemo(
    () => (metricsQuery.data ?? []).filter((m) => m.is_active),
    [metricsQuery.data],
  );
  const levels = useMemo(
    () => [...(levelsQuery.data ?? [])].sort((a, b) => a.rank - b.rank),
    [levelsQuery.data],
  );

  // Group goals under their metric for the list (metrics with no goal still shown).
  const metricName = useMemo(
    () => new Map((metricsQuery.data ?? []).map((m) => [m.id, m.name] as const)),
    [metricsQuery.data],
  );
  const goalsByMetric = useMemo(() => {
    const map = new Map<number, GoalConfig[]>();
    for (const g of goals) {
      const list = map.get(g.metric) ?? [];
      list.push(g);
      map.set(g.metric, list);
    }
    return map;
  }, [goals]);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (goal: GoalConfig) => {
    setEditing(goal);
    setEditorOpen(true);
  };

  const submit = async (draft: GoalDraft) => {
    if (draft.metric == null) return;
    const { level, atOrAbove } = parseBand(draft.band);

    // Guard the resolver's identity key on create: one goal per (metric, band, scope).
    if (!editing) {
      const dup = goals.some(
        (g) =>
          g.metric === draft.metric &&
          g.scope === 'INDIVIDUAL' &&
          g.level === level &&
          g.applies_at_or_above === atOrAbove,
      );
      if (dup) {
        addToast({
          type: 'error',
          message: 'A goal already exists for this metric and level band.',
        });
        return;
      }
    }

    const metricCode = metrics.find((m) => m.id === draft.metric)?.code ?? String(draft.metric);
    const bandName = bandLabel(level, atOrAbove, levels);
    const payload: GoalWriteInput = {
      program: program?.id,
      metric: draft.metric,
      name: draft.name.trim() || `${metricName.get(draft.metric) ?? metricCode} — ${bandName}`,
      code: editing ? editing.code : `${metricCode}_${bandSlug(level, atOrAbove, levels)}`,
      target: draft.target.trim(),
      period_type: draft.period_type,
      scope: 'INDIVIDUAL',
      level,
      applies_at_or_above: atOrAbove,
      display_cap_100: draft.display_cap_100,
      is_active: draft.is_active,
    };

    try {
      if (editing) {
        await mut.updateGoal.mutateAsync({ id: editing.id, payload });
        addToast({ type: 'success', message: 'Goal updated.' });
      } else {
        await mut.createGoal.mutateAsync(payload);
        addToast({ type: 'success', message: 'Goal created.' });
      }
      setEditorOpen(false);
      setEditing(null);
    } catch (err) {
      addToast({ type: 'error', message: (err as Error)?.message ?? 'Save failed.' });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await mut.deleteGoal.mutateAsync(deleting.id);
      addToast({ type: 'success', message: 'Goal deleted.' });
    } catch (err) {
      addToast({ type: 'error', message: (err as Error)?.message ?? 'Delete failed.' });
    } finally {
      setDeleting(null);
    }
  };

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
          <Target size={20} /> Goals
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-white/60">
          Set per-metric targets. Give a rank band (e.g. SMD and above) its own target; a
          default applies to everyone else.
        </p>
      </div>
      {canManage && program && metrics.length > 0 && !(editorOpen && !editing) && (
        <Button onClick={openCreate}>
          <Plus size={16} /> New goal
        </Button>
      )}
    </div>
  );

  if (programsQuery.isLoading || goalsQuery.isLoading) {
    return <LoadingState pageHeading="Goals" title="Loading" description="Fetching goals…" />;
  }

  // A viewer without `builder_goal:read/manage` gets 403 on the config list.
  if (goalsQuery.isError) {
    return (
      <ErrorState
        pageHeading="Goals"
        description="You do not have access to edit goals for this program."
        onRetry={() => goalsQuery.refetch()}
      />
    );
  }

  if (!program) {
    return (
      <div className="space-y-5">
        {header}
        <NonIdealState
          icon={<Target size={28} strokeWidth={1.5} />}
          title="No program yet"
          description="Create a Builder Program first — goals are configured per program."
        />
        <Link to="/builder-ai/program" className="text-sm text-blue-600 hover:underline">
          Go to Program →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {header}

      {canManage && (
        <GoalEditorPanel
          open={editorOpen}
          goal={editing}
          metrics={metrics}
          levels={levels}
          isSaving={saving}
          onClose={() => {
            setEditorOpen(false);
            setEditing(null);
          }}
          onSubmit={submit}
        />
      )}

      {editorOpen && !editing ? null : goals.length === 0 ? (
        <NonIdealState
          icon={<Target size={28} strokeWidth={1.5} />}
          title="No goals yet"
          description={
            canManage
              ? 'Add a goal to set a target for a metric — optionally for a specific rank band.'
              : 'No goals have been configured for this program yet.'
          }
          actionLabel={canManage && metrics.length > 0 ? 'New goal' : undefined}
          onAction={canManage && metrics.length > 0 ? openCreate : undefined}
        />
      ) : (
        <div className="space-y-4">
          {[...goalsByMetric.entries()].map(([metricId, rows]) => (
            <div
              key={metricId}
              className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
            >
              <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                {metricName.get(metricId) ?? `Metric #${metricId}`}
              </h2>
              <div className="space-y-1.5">
                {rows.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-100 px-3 py-2 dark:border-white/5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {bandLabel(g.level, g.applies_at_or_above, levels)}
                      </Badge>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {g.target}
                      </span>
                      <span className="text-xs text-slate-400">
                        {g.period_type.charAt(0) + g.period_type.slice(1).toLowerCase()}
                      </span>
                      {!g.is_active && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" onClick={() => openEdit(g)}>
                          <Pencil size={15} /> Edit
                        </Button>
                        <Button variant="ghost" onClick={() => setDeleting(g)}>
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete goal"
        message={
          deleting
            ? `Delete the ${bandLabel(deleting.level, deleting.applies_at_or_above, levels)} target for ${metricName.get(deleting.metric) ?? 'this metric'}?`
            : ''
        }
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
