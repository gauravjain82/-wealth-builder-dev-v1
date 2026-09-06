/**
 * BuilderProgramPage — create and edit Builder Programs from the UI.
 *
 * The program is the one-tenant container everything else hangs off. Creating one
 * here also bootstraps its standard template server-side (invitation rule, metrics,
 * goals, the per-tier dashboards + Reporting, leaderboards), so a program
 * created from the UI is immediately usable — no seed command or Django admin needed.
 *
 * Gated by `builder_program:manage` (the backend enforces it; the menu hides this
 * page otherwise). `code` is the stable key and is locked once a program exists.
 */

import { useEffect, useState } from 'react';
import { Building2, Pencil, Plus, X } from 'lucide-react';
import {
  Badge,
  Button,
  ErrorState,
  Input,
  LoadingState,
  NonIdealState,
  Select,
} from '@shared/components';
import { useToastStore } from '@/store';
import { useMyBuilderAccess, usePrograms } from '../hooks/use-builder-ai';
import { useProgramMutations } from '../hooks/use-builder-config';
import { METRIC_PERIOD_TYPES, SEGMENT_LABEL_FIELDS } from '../types';
import type { BuilderProgram, BuilderProgramWriteInput } from '../types';

const STATUSES: BuilderProgram['status'][] = ['ACTIVE', 'DRAFT', 'ARCHIVED'];

const NEW_DRAFT: BuilderProgramWriteInput = {
  name: '',
  code: '',
  status: 'ACTIVE',
  timezone: 'America/New_York',
  start_date: null,
  config: {},
};

/** Read the configured `segment_labels` map out of a program config blob. */
function segmentLabels(config: Record<string, unknown> | undefined): Record<string, string> {
  const labels = config?.segment_labels;
  return labels && typeof labels === 'object' ? (labels as Record<string, string>) : {};
}

/** Read a string config key (e.g. `metric_period_type`, `qualifying_metric`). */
function configString(config: Record<string, unknown> | undefined, key: string): string {
  const value = config?.[key];
  return typeof value === 'string' ? value : '';
}

/** Read `roster_metrics` as a comma-joined string for editing. */
function rosterMetricsText(config: Record<string, unknown> | undefined): string {
  const codes = config?.roster_metrics;
  return Array.isArray(codes) ? codes.filter((c) => typeof c === 'string').join(', ') : '';
}

/** Inline create/edit panel for a program's identity + settings. */
function ProgramEditorPanel({
  open,
  program,
  isSaving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  program: BuilderProgram | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (draft: BuilderProgramWriteInput) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<BuilderProgramWriteInput>(NEW_DRAFT);
  // `roster_metrics` is stored in config as an array, but edited as raw comma text so
  // typing a separator isn't stripped mid-keystroke. Kept in local state, parsed on change.
  const [rosterText, setRosterText] = useState('');

  useEffect(() => {
    if (!open) return;
    setDraft(
      program
        ? {
            name: program.name,
            code: program.code,
            status: program.status,
            timezone: program.timezone,
            start_date: program.start_date,
            config: program.config ?? {},
          }
        : NEW_DRAFT,
    );
    setRosterText(rosterMetricsText(program?.config));
  }, [open, program]);

  if (!open) return null;

  const canSave = draft.name.trim() !== '' && draft.code.trim() !== '';
  const labels = segmentLabels(draft.config);

  // Edit one tier's label, preserving other config keys. An empty value clears the
  // override so the tier falls back to its canonical name (Decision 31/28).
  const setLabel = (key: string, value: string) =>
    setDraft((d) => {
      const config = { ...(d.config ?? {}) };
      const next = { ...segmentLabels(config) };
      if (value.trim()) next[key] = value;
      else delete next[key];
      config.segment_labels = next;
      return { ...d, config };
    });

  // Set a scalar config key, clearing it when blank so the tier falls back to the
  // backend default (metric_period_type→MONTHLY, qualifying_metric→points, Decision 28).
  const setConfigKey = (key: string, value: string) =>
    setDraft((d) => {
      const config = { ...(d.config ?? {}) };
      if (value.trim()) config[key] = value.trim();
      else delete config[key];
      return { ...d, config };
    });

  // Parse the raw roster text into an ordered code list; blank clears the override.
  const setRosterMetrics = (value: string) => {
    setRosterText(value);
    setDraft((d) => {
      const config = { ...(d.config ?? {}) };
      const codes = value
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      if (codes.length) config.roster_metrics = codes;
      else delete config.roster_metrics;
      return { ...d, config };
    });
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          {program ? 'Edit program' : 'New program'}
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
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/60">
            Name
          </label>
          <Input
            autoFocus
            value={draft.name}
            placeholder="e.g. Billion Dollar Company"
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/60">
            Code {program && <span className="text-slate-400">(locked)</span>}
          </label>
          <Input
            value={draft.code}
            disabled={Boolean(program)}
            placeholder="e.g. BDC"
            onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
          />
          {!program && (
            <p className="mt-1 text-xs text-slate-400">
              Stable identifier used by config and seeds. Cannot be changed later.
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/60">
              Status
            </label>
            <Select
              value={draft.status}
              onChange={(e) =>
                setDraft((d) => ({ ...d, status: e.target.value as BuilderProgram['status'] }))
              }
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/60">
              Timezone
            </label>
            <Input
              value={draft.timezone}
              placeholder="America/New_York"
              onChange={(e) => setDraft((d) => ({ ...d, timezone: e.target.value }))}
            />
            <p className="mt-1 text-xs text-slate-400">
              IANA name; period boundaries are calendar dates in this zone.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/60">
              Start date <span className="text-slate-400">(optional)</span>
            </label>
            <Input
              type="date"
              value={draft.start_date ?? ''}
              onChange={(e) =>
                setDraft((d) => ({ ...d, start_date: e.target.value || null }))
              }
            />
          </div>
        </div>
        <div className="border-t border-slate-200 pt-4 dark:border-white/10">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/60">
            Metrics &amp; qualification
          </label>
          <p className="mb-3 text-xs text-slate-400">
            How metrics are aggregated and which one drives qualification. Leave blank to
            use the defaults (monthly cadence, qualifying on points).
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Metric period
              </label>
              <Select
                value={configString(draft.config, 'metric_period_type') || 'MONTHLY'}
                onChange={(e) => setConfigKey('metric_period_type', e.target.value)}
              >
                {METRIC_PERIOD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Qualifying metric
              </label>
              <Input
                value={configString(draft.config, 'qualifying_metric')}
                placeholder="points"
                onChange={(e) => setConfigKey('qualifying_metric', e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Roster metrics
            </label>
            <Input
              value={rosterText}
              placeholder="recruits, points, licenses, registrations"
              onChange={(e) => setRosterMetrics(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-400">
              Comma-separated metric codes shown as roster columns, in order. Blank uses the
              program default.
            </p>
          </div>
        </div>
        <div className="border-t border-slate-200 pt-4 dark:border-white/10">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/60">
            Dashboard tier names
          </label>
          <p className="mb-3 text-xs text-slate-400">
            What to call each segment on the dashboard toggle. Leave blank to use the
            default. The tiers themselves (split at each SMD) don&apos;t change — only the
            labels.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {SEGMENT_LABEL_FIELDS.map(({ key, fallback }) => (
              <div key={key}>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {fallback}
                </label>
                <Input
                  value={labels[key] ?? ''}
                  placeholder={fallback}
                  onChange={(e) => setLabel(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void onSubmit(draft)} disabled={!canSave || isSaving}>
            {isSaving ? 'Saving…' : program ? 'Save' : 'Create program'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Render the Builder AI Program management page. */
export default function BuilderProgramPage() {
  const addToast = useToastStore((s) => s.addToast);
  const access = useMyBuilderAccess();
  const canManage = Boolean(access.data?.program.manage);

  const programsQuery = usePrograms();
  const { createProgram, updateProgram } = useProgramMutations();
  const saving = createProgram.isPending || updateProgram.isPending;

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<BuilderProgram | null>(null);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (program: BuilderProgram) => {
    setEditing(program);
    setEditorOpen(true);
  };

  const submit = async (draft: BuilderProgramWriteInput) => {
    try {
      if (editing) {
        // `code` is locked; send only the editable fields.
        const { code: _code, ...payload } = draft;
        await updateProgram.mutateAsync({ id: editing.id, payload });
        addToast({ type: 'success', message: 'Program updated.' });
      } else {
        await createProgram.mutateAsync(draft);
        addToast({ type: 'success', message: 'Program created with default dashboards.' });
      }
      setEditorOpen(false);
      setEditing(null);
    } catch (err) {
      addToast({ type: 'error', message: (err as Error)?.message ?? 'Save failed.' });
    }
  };

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
          <Building2 size={20} /> Program
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-white/60">
          Create and configure the Builder Program. Creating one sets up its default
          dashboards, metrics, goals, and invitation rule automatically.
        </p>
      </div>
      {canManage && !(editorOpen && !editing) && (
        <Button onClick={openCreate}>
          <Plus size={16} /> New program
        </Button>
      )}
    </div>
  );

  if (programsQuery.isLoading) {
    return <LoadingState pageHeading="Program" title="Loading" description="Fetching programs…" />;
  }

  if (programsQuery.isError) {
    return (
      <ErrorState
        pageHeading="Program"
        description={(programsQuery.error as Error)?.message ?? 'Failed to load programs.'}
        onRetry={() => programsQuery.refetch()}
      />
    );
  }

  const programs = programsQuery.data ?? [];

  return (
    <div className="space-y-5">
      {header}

      <ProgramEditorPanel
        open={editorOpen}
        program={editing}
        isSaving={saving}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSubmit={submit}
      />

      {editorOpen && !editing ? null : programs.length === 0 ? (
        <NonIdealState
          icon={<Building2 size={28} strokeWidth={1.5} />}
          title="No program yet"
          description={
            canManage
              ? 'Create your first Builder Program to unlock dashboards, invitations, and reporting.'
              : "No Builder Program has been set up yet. Ask an administrator to create one."
          }
          actionLabel={canManage ? 'New program' : undefined}
          onAction={canManage ? openCreate : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {programs.map((program) => (
            <div
              key={program.id}
              className="rounded-lg border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-slate-900 dark:text-white">{program.name}</h2>
                    <Badge variant={program.status === 'ACTIVE' ? 'success' : 'secondary'}>
                      {program.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-white/60">
                    Code {program.code} · {program.timezone}
                  </p>
                </div>
                {canManage && (
                  <Button variant="outline" onClick={() => openEdit(program)}>
                    <Pencil size={15} /> Edit
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
