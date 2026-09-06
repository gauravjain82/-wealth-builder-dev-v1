/**
 * DashboardEditorModal — create or edit a dashboard's identity.
 *
 * Edits name, code (stable key seeds/config use), and default segment. `code` is
 * locked while editing an existing dashboard (it is the seed/upsert key). Layout
 * (sections/widgets) is edited on the canvas, not here.
 */

import { useEffect, useState } from 'react';
import { Button, Input, Modal, Select } from '@shared/components';
import type { DashboardConfig, Segment } from '../../types';
import { SEGMENTS } from './widget-type-meta';

export interface DashboardDraft {
  name: string;
  code: string;
  default_scope: Segment;
}

export interface DashboardEditorModalProps {
  open: boolean;
  /** The dashboard being edited, or `null` when creating a new one. */
  dashboard: DashboardConfig | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (draft: DashboardDraft) => void | Promise<void>;
}

const NEW_DRAFT: DashboardDraft = { name: '', code: '', default_scope: 'INDIVIDUAL' };

/** Render the dashboard create/edit modal. */
export function DashboardEditorModal({
  open,
  dashboard,
  isSaving,
  onClose,
  onSubmit,
}: DashboardEditorModalProps) {
  const [draft, setDraft] = useState<DashboardDraft>(NEW_DRAFT);

  useEffect(() => {
    if (!open) return;
    setDraft(
      dashboard
        ? { name: dashboard.name, code: dashboard.code, default_scope: dashboard.default_scope }
        : NEW_DRAFT,
    );
  }, [open, dashboard]);

  const canSave = draft.name.trim() !== '' && draft.code.trim() !== '';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={dashboard ? 'Edit dashboard' : 'New dashboard'}
      className="max-w-[460px]"
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/60">
            Name
          </label>
          <Input
            autoFocus
            value={draft.name}
            placeholder="e.g. Company"
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/60">
            Code {dashboard && <span className="text-slate-400">(locked)</span>}
          </label>
          <Input
            value={draft.code}
            disabled={Boolean(dashboard)}
            placeholder="e.g. bdc_company"
            onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/60">
            Default segment
          </label>
          <Select
            value={draft.default_scope}
            onChange={(e) =>
              setDraft((d) => ({ ...d, default_scope: e.target.value as Segment }))
            }
          >
            {SEGMENTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void onSubmit(draft)} disabled={!canSave || isSaving}>
            {isSaving ? 'Saving…' : dashboard ? 'Save' : 'Create'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
