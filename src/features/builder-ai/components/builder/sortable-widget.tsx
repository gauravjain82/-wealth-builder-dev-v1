/**
 * SortableWidget — a draggable widget chip in the dashboard builder canvas.
 *
 * Shows the widget's type icon, title/metric, and target segment, tinted with the
 * metric's configured colour so the layout reads at a glance (Decision 27). The
 * whole card is the drag handle (widgets move freely within/across sections); a
 * separate Edit button opens the editor without starting a drag.
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil } from 'lucide-react';
import { metricColorHex } from '../../theme';
import type { MetricDefinitionConfig, WidgetConfig } from '../../types';
import { widgetTypeMeta } from './widget-type-meta';

export interface SortableWidgetProps {
  widget: WidgetConfig;
  metric: MetricDefinitionConfig | undefined;
  onEdit: (widget: WidgetConfig) => void;
}

/** Render one draggable widget card. */
export function SortableWidget({ widget, metric, onEdit }: SortableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `widget:${widget.id}`,
    data: { type: 'widget', widget },
  });

  const meta = widgetTypeMeta(widget.type);
  const Icon = meta.icon;
  const accent = metricColorHex(metric?.code ?? '', metric?.display?.color);
  const label = widget.title || metric?.name || meta.label;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        borderLeftColor: accent,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-2 rounded-lg border border-l-4 border-slate-200 bg-white px-2.5 py-2 shadow-sm dark:border-white/10 dark:bg-white/5"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-slate-400 hover:text-slate-600 active:cursor-grabbing dark:text-white/40 dark:hover:text-white/70"
        aria-label="Drag widget"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      <Icon size={16} style={{ color: accent }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800 dark:text-white/90">{label}</p>
        <p className="truncate text-[11px] text-slate-400 dark:text-white/50">
          {meta.label} · {widget.scope.toLowerCase()}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onEdit(widget)}
        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label="Edit widget"
      >
        <Pencil size={14} />
      </button>
    </div>
  );
}
