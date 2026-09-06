/**
 * WidgetEditorModal — create or edit one dashboard widget.
 *
 * Pick the renderer type, the metric it visualises, the builder segment, and a
 * title. The type list and segment list come from `widget-type-meta` (config, not
 * hardcoded branches — Decision 29). On save the parent persists via the config API;
 * this component is presentational + local form state only (Decision 24 SRP).
 */

import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Modal, Select } from '@shared/components';
import type { MetricDefinitionConfig, Segment, WidgetConfig, WidgetType } from '../../types';
import { SEGMENTS, WIDGET_TYPES, widgetTypeMeta } from './widget-type-meta';

export interface WidgetDraft {
  type: WidgetType;
  metric: number | null;
  scope: Segment;
  title: string;
}

export interface WidgetEditorModalProps {
  open: boolean;
  /** The widget being edited, or `null` when adding a new one. */
  widget: WidgetConfig | null;
  /** Metric definitions for the metric picker. */
  metrics: MetricDefinitionConfig[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (draft: WidgetDraft) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}

/** Sensible defaults for a brand-new widget. */
const NEW_DRAFT: WidgetDraft = {
  type: 'stat_sparkline',
  metric: null,
  scope: 'INDIVIDUAL',
  title: '',
};

/** Render the widget create/edit modal. */
export function WidgetEditorModal({
  open,
  widget,
  metrics,
  isSaving,
  onClose,
  onSubmit,
  onDelete,
}: WidgetEditorModalProps) {
  const [draft, setDraft] = useState<WidgetDraft>(NEW_DRAFT);

  // Re-seed the form whenever the modal opens for a different widget.
  useEffect(() => {
    if (!open) return;
    setDraft(
      widget
        ? { type: widget.type, metric: widget.metric, scope: widget.scope, title: widget.title }
        : NEW_DRAFT,
    );
  }, [open, widget]);

  const meta = widgetTypeMeta(draft.type);
  const metricRequired = meta.needsMetric;
  const canSave = useMemo(
    () => !metricRequired || draft.metric != null,
    [metricRequired, draft.metric],
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={widget ? 'Edit widget' : 'Add widget'}
      className="max-w-[520px]"
    >
      <div className="space-y-4">
        <Field label="Type">
          <Select
            value={draft.type}
            onChange={(e) =>
              setDraft((d) => ({ ...d, type: e.target.value as WidgetType }))
            }
          >
            {WIDGET_TYPES.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={metricRequired ? 'Metric' : 'Metric (optional)'}>
          <Select
            value={draft.metric == null ? '' : String(draft.metric)}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                metric: e.target.value === '' ? null : Number(e.target.value),
              }))
            }
          >
            <option value="">— None —</option>
            {metrics.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.code})
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Segment">
          <Select
            value={draft.scope}
            onChange={(e) => setDraft((d) => ({ ...d, scope: e.target.value as Segment }))}
          >
            {SEGMENTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Title (optional)">
          <Input
            value={draft.title}
            placeholder="Defaults to the metric name"
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          />
        </Field>

        <div className="flex items-center justify-between gap-2 pt-1">
          {widget && onDelete ? (
            <Button variant="outline" onClick={() => void onDelete()} disabled={isSaving}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={() => void onSubmit(draft)} disabled={!canSave || isSaving}>
              {isSaving ? 'Saving…' : widget ? 'Save' : 'Add widget'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/** A labelled form field wrapper matching the invitation modal's field style. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/60">
        {label}
      </label>
      {children}
    </div>
  );
}
