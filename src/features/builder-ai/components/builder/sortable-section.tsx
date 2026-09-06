/**
 * SortableSection — a draggable dashboard section in the builder canvas.
 *
 * The header carries the drag handle (so sections reorder without stealing widget
 * drags) plus rename/delete and "add widget" actions. The body is a droppable zone
 * so widgets can be dropped into an empty section (cross-section moves). Widget
 * ordering itself is handled by the parent's SortableContext passed as children.
 */

import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { ButtonIcon } from '@shared/components';
import type { SectionConfig } from '../../types';

/** The droppable id used for a section's widget body (see dashboard-builder). */
function sectionContainerId(sectionId: number): string {
  return `container:${sectionId}`;
}

export interface SortableSectionProps {
  section: SectionConfig;
  isEmpty: boolean;
  onAddWidget: (section: SectionConfig) => void;
  onRename: (section: SectionConfig) => void;
  onDelete: (section: SectionConfig) => void;
  children: React.ReactNode;
}

/** Render one draggable section with its (child-rendered) widgets. */
export function SortableSection({
  section,
  isEmpty,
  onAddWidget,
  onRename,
  onDelete,
  children,
}: SortableSectionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `section:${section.id}`,
    data: { type: 'section', section },
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: sectionContainerId(section.id),
    data: { type: 'container', sectionId: section.id },
  });

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-white/10 dark:bg-white/[0.03]"
    >
      <header className="mb-2 flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab touch-none text-slate-400 hover:text-slate-600 active:cursor-grabbing dark:text-white/40 dark:hover:text-white/70"
          aria-label="Drag section"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} />
        </button>
        <h3 className="flex-1 text-sm font-semibold text-slate-700 dark:text-white/80">
          {section.title || <span className="italic text-slate-400">Untitled section</span>}
        </h3>
        <ButtonIcon
          icon={<Pencil size={15} />}
          ariaLabel="Rename section"
          variant="ghost"
          size="sm"
          onClick={() => onRename(section)}
        />
        <ButtonIcon
          icon={<Plus size={16} />}
          ariaLabel="Add widget"
          variant="ghost"
          size="sm"
          onClick={() => onAddWidget(section)}
        />
        <ButtonIcon
          icon={<Trash2 size={15} />}
          ariaLabel="Delete section"
          variant="ghost"
          size="sm"
          onClick={() => onDelete(section)}
        />
      </header>
      <div
        ref={setDropRef}
        className={[
          'grid gap-2 rounded-lg p-1 transition-colors sm:grid-cols-2 xl:grid-cols-3',
          isOver ? 'bg-primary/5 ring-1 ring-primary/40' : '',
          isEmpty ? 'min-h-[56px] place-content-center' : '',
        ].join(' ')}
      >
        {isEmpty ? (
          <p className="col-span-full text-center text-xs text-slate-400 dark:text-white/40">
            Drop a widget here or use +
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
