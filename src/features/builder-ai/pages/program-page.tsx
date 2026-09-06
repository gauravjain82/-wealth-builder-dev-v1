/**
 * BuilderProgramPage — create and edit Builder Programs from the UI.
 *
 * The program is the one-tenant container everything else hangs off. Creating one
 * here also bootstraps its standard template server-side (invitation rule, metrics,
 * goals, the Home/Company/BaseShop/Reporting dashboards, leaderboards), so a program
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
import type { BuilderProgram, BuilderProgramWriteInput } from '../types';

const STATUSES: BuilderProgram['status'][] = ['ACTIVE', 'DRAFT', 'ARCHIVED'];

const NEW_DRAFT: BuilderProgramWriteInput = {
  name: '',
  code: '',
  status: 'ACTIVE',
  timezone: 'America/New_York',
  start_date: null,
};

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
          }
        : NEW_DRAFT,
    );
  }, [open, program]);

  if (!open) return null;

  const canSave = draft.name.trim() !== '' && draft.code.trim() !== '';

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
