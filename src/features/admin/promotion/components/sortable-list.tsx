import type { ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@core/utils';

interface SortableListProps<T extends { id: number }> {
  items: T[];
  /** Called with every id in the new order after a drop that changed it. */
  onReorder: (ids: number[]) => void;
  /** Render one row; place `handle` where the drag grip should sit. */
  renderItem: (item: T, handle: ReactNode) => ReactNode;
  /** Accessible name for an item's drag handle. */
  itemLabel: (item: T) => string;
  className?: string;
  disabled?: boolean;
}

/**
 * A vertical list reordered by dragging a grip — or, with the grip focused, Space then
 * the arrow keys. The same dnd-kit setup as the event page builder.
 */
export function SortableList<T extends { id: number }>({
  items,
  onReorder,
  renderItem,
  itemLabel,
  className,
  disabled = false,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((item) => item.id === active.id);
    const to = items.findIndex((item) => item.id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(items, from, to).map((item) => item.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <ul className={className}>
          {items.map((item) => (
            <SortableRow
              key={item.id}
              id={item.id}
              label={itemLabel(item)}
              disabled={disabled || items.length < 2}
            >
              {(handle) => renderItem(item, handle)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  label,
  disabled,
  children,
}: {
  id: number;
  label: string;
  disabled: boolean;
  children: (handle: ReactNode) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Reorder ${label}`}
      disabled={disabled}
      className="cursor-grab rounded p-1.5 text-slate-400 hover:bg-slate-100 active:cursor-grabbing disabled:cursor-default disabled:opacity-30 dark:text-white/40 dark:hover:bg-white/10"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'relative z-10 shadow-lg')}
    >
      {children(handle)}
    </li>
  );
}
