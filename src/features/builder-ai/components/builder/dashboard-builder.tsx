/**
 * DashboardBuilder — the drag-drop canvas for one dashboard's layout (Phase 4).
 *
 * Renders a dashboard's sections (reorderable) and, within each, its widgets
 * (reorderable and movable across sections). A single `DndContext` handles both:
 * `useSortable` binds to the nearest context, so nesting two contexts would capture
 * the wrong drags — instead we branch on the dragged item's `type` (section|widget).
 * Reorders persist in one bulk call per list (Decision 27) and are audited server-side
 * (Decision 28). Local ordering state mirrors the query so drags feel instant, then
 * the mutation invalidates and the query reconciles.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button, LoadingState } from '@shared/components';
import { Plus } from 'lucide-react';
import { useToastStore } from '@/store';
import {
  useDashboardBuilderMutations,
  useMetricDefinitions,
  useSections,
  useWidgets,
} from '../../hooks/use-builder-config';
import type {
  DashboardConfig,
  MetricDefinitionConfig,
  SectionConfig,
  WidgetConfig,
} from '../../types';
import { SortableSection } from './sortable-section';
import { SortableWidget } from './sortable-widget';
import { WidgetEditorModal, type WidgetDraft } from './widget-editor-modal';
import { SectionEditorModal } from './section-editor-modal';

export interface DashboardBuilderProps {
  dashboard: DashboardConfig;
}

/** Group widgets by their section id, each list sorted by `order`. */
function groupWidgets(widgets: WidgetConfig[]): Record<number, WidgetConfig[]> {
  const map: Record<number, WidgetConfig[]> = {};
  for (const w of [...widgets].sort((a, b) => a.order - b.order)) {
    (map[w.section] ??= []).push(w);
  }
  return map;
}

/** Render the drag-drop dashboard builder for one dashboard. */
export function DashboardBuilder({ dashboard }: DashboardBuilderProps) {
  const addToast = useToastStore((s) => s.addToast);
  const sectionsQuery = useSections(dashboard.id);
  const widgetsQuery = useWidgets(dashboard.id);
  const metricsQuery = useMetricDefinitions(dashboard.program);
  const m = useDashboardBuilderMutations(dashboard.id);

  // Local ordering state mirrors the queries so drags feel instant.
  const [sections, setSections] = useState<SectionConfig[]>([]);
  const [widgetsBySection, setWidgetsBySection] = useState<Record<number, WidgetConfig[]>>({});

  useEffect(() => {
    if (sectionsQuery.data) {
      setSections([...sectionsQuery.data].sort((a, b) => a.order - b.order));
    }
  }, [sectionsQuery.data]);
  useEffect(() => {
    if (widgetsQuery.data) setWidgetsBySection(groupWidgets(widgetsQuery.data));
  }, [widgetsQuery.data]);

  const metricsById = useMemo(() => {
    const map = new Map<number, MetricDefinitionConfig>();
    for (const metric of metricsQuery.data ?? []) map.set(metric.id, metric);
    return map;
  }, [metricsQuery.data]);

  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null);
  const [addingToSection, setAddingToSection] = useState<SectionConfig | null>(null);
  const [widgetModalOpen, setWidgetModalOpen] = useState(false);
  const [sectionModal, setSectionModal] = useState<{ open: boolean; section: SectionConfig | null }>(
    { open: false, section: null },
  );
  const [activeType, setActiveType] = useState<'section' | 'widget' | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const notifyError = (err: unknown) =>
    addToast({ type: 'error', message: (err as Error)?.message ?? 'Save failed.' });

  // -- drag helpers ---------------------------------------------------------

  /** Resolve the section id that owns a droppable/sortable id, or null. */
  const findContainer = (id: string): number | null => {
    if (id.startsWith('container:')) return Number(id.slice('container:'.length));
    if (id.startsWith('widget:')) {
      const wid = Number(id.slice('widget:'.length));
      for (const [secId, list] of Object.entries(widgetsBySection)) {
        if (list.some((w) => w.id === wid)) return Number(secId);
      }
    }
    return null;
  };

  const onDragStart = (e: DragStartEvent) => {
    setActiveType((e.active.data.current?.type as 'section' | 'widget') ?? null);
  };

  /** Move a widget between sections mid-drag so the drop target previews correctly. */
  const onDragOver = (e: DragOverEvent) => {
    if (activeType !== 'widget' || !e.over) return;
    const activeId = String(e.active.id);
    const overId = String(e.over.id);
    const from = findContainer(activeId);
    const to = findContainer(overId);
    if (from == null || to == null || from === to) return;

    setWidgetsBySection((prev) => {
      const wid = Number(activeId.slice('widget:'.length));
      const source = [...(prev[from] ?? [])];
      const target = [...(prev[to] ?? [])];
      const idx = source.findIndex((w) => w.id === wid);
      if (idx === -1) return prev;
      const [moved] = source.splice(idx, 1);
      // Insert before the widget we're hovering, or at the end for a container drop.
      const overIdx = overId.startsWith('widget:')
        ? target.findIndex((w) => w.id === Number(overId.slice('widget:'.length)))
        : target.length;
      target.splice(overIdx < 0 ? target.length : overIdx, 0, { ...moved, section: to });
      return { ...prev, [from]: source, [to]: target };
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const type = activeType;
    setActiveType(null);
    if (!e.over) return;
    const activeId = String(e.active.id);
    const overId = String(e.over.id);

    if (type === 'section') {
      if (!overId.startsWith('section:') || activeId === overId) return;
      const from = sections.findIndex((s) => `section:${s.id}` === activeId);
      const to = sections.findIndex((s) => `section:${s.id}` === overId);
      if (from === -1 || to === -1) return;
      const next = arrayMove(sections, from, to);
      setSections(next);
      m.reorderSections
        .mutateAsync(next.map((s, i) => ({ id: s.id, order: i })))
        .catch(notifyError);
      return;
    }

    if (type === 'widget') {
      const container = findContainer(overId) ?? findContainer(activeId);
      if (container == null) return;
      const wid = Number(activeId.slice('widget:'.length));
      const list = [...(widgetsBySection[container] ?? [])];
      const from = list.findIndex((w) => w.id === wid);
      const overIdx = overId.startsWith('widget:')
        ? list.findIndex((w) => w.id === Number(overId.slice('widget:'.length)))
        : list.length - 1;
      if (from !== -1 && overIdx !== -1 && from !== overIdx) {
        const next = arrayMove(list, from, overIdx);
        setWidgetsBySection((prev) => ({ ...prev, [container]: next }));
        persistWidgets(container, next);
      } else {
        // Cross-section move already applied by onDragOver — persist as-is.
        persistWidgets(container, list);
      }
    }
  };

  /** Persist the given section's widget order (+ any new section binding). */
  const persistWidgets = (sectionId: number, list: WidgetConfig[]) => {
    m.reorderWidgets
      .mutateAsync(list.map((w, i) => ({ id: w.id, order: i, section: sectionId })))
      .catch(notifyError);
  };

  // -- section / widget CRUD ------------------------------------------------

  const submitSection = async (title: string) => {
    try {
      if (sectionModal.section) {
        await m.updateSection.mutateAsync({ id: sectionModal.section.id, payload: { title } });
      } else {
        await m.createSection.mutateAsync({
          program: dashboard.program,
          dashboard: dashboard.id,
          title,
          order: sections.length,
        });
      }
      setSectionModal({ open: false, section: null });
    } catch (err) {
      notifyError(err);
    }
  };

  const deleteSection = async (section: SectionConfig) => {
    if (!window.confirm(`Delete section "${section.title || 'Untitled'}" and its widgets?`)) return;
    try {
      await m.deleteSection.mutateAsync(section.id);
    } catch (err) {
      notifyError(err);
    }
  };

  const submitWidget = async (draft: WidgetDraft) => {
    try {
      if (editingWidget) {
        await m.updateWidget.mutateAsync({
          id: editingWidget.id,
          payload: { type: draft.type, metric: draft.metric, scope: draft.scope, title: draft.title },
        });
      } else if (addingToSection) {
        const count = widgetsBySection[addingToSection.id]?.length ?? 0;
        await m.createWidget.mutateAsync({
          program: dashboard.program,
          section: addingToSection.id,
          type: draft.type,
          metric: draft.metric,
          scope: draft.scope,
          title: draft.title,
          order: count,
        });
      }
      closeWidgetModal();
    } catch (err) {
      notifyError(err);
    }
  };

  const deleteWidget = async () => {
    if (!editingWidget) return;
    try {
      await m.deleteWidget.mutateAsync(editingWidget.id);
      closeWidgetModal();
    } catch (err) {
      notifyError(err);
    }
  };

  const openAddWidget = (section: SectionConfig) => {
    setEditingWidget(null);
    setAddingToSection(section);
    setWidgetModalOpen(true);
  };
  const openEditWidget = (widget: WidgetConfig) => {
    setAddingToSection(null);
    setEditingWidget(widget);
    setWidgetModalOpen(true);
  };
  const closeWidgetModal = () => {
    setWidgetModalOpen(false);
    setEditingWidget(null);
    setAddingToSection(null);
  };

  if (sectionsQuery.isLoading || widgetsQuery.isLoading) {
    return <LoadingState title="Loading layout" description="Fetching sections and widgets…" />;
  }

  const savingWidget =
    m.createWidget.isPending || m.updateWidget.isPending || m.deleteWidget.isPending;
  const savingSection = m.createSection.isPending || m.updateSection.isPending;

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={sections.map((s) => `section:${s.id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {sections.map((section) => {
              const widgets = widgetsBySection[section.id] ?? [];
              return (
                <SortableSection
                  key={section.id}
                  section={section}
                  isEmpty={widgets.length === 0}
                  onAddWidget={openAddWidget}
                  onRename={(s) => setSectionModal({ open: true, section: s })}
                  onDelete={deleteSection}
                >
                  <SortableContext
                    items={widgets.map((w) => `widget:${w.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {widgets.map((w) => (
                      <SortableWidget
                        key={w.id}
                        widget={w}
                        metric={w.metric != null ? metricsById.get(w.metric) : undefined}
                        onEdit={openEditWidget}
                      />
                    ))}
                  </SortableContext>
                </SortableSection>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <Button
        variant="outline"
        onClick={() => setSectionModal({ open: true, section: null })}
        className="w-full"
      >
        <Plus size={16} /> Add section
      </Button>

      <WidgetEditorModal
        open={widgetModalOpen}
        widget={editingWidget}
        metrics={metricsQuery.data ?? []}
        isSaving={savingWidget}
        onClose={closeWidgetModal}
        onSubmit={submitWidget}
        onDelete={editingWidget ? deleteWidget : undefined}
      />
      <SectionEditorModal
        open={sectionModal.open}
        section={sectionModal.section}
        isSaving={savingSection}
        onClose={() => setSectionModal({ open: false, section: null })}
        onSubmit={submitSection}
      />
    </div>
  );
}
