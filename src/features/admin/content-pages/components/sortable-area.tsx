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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@core/utils';

type SortableAreaProps<T extends { id: number }> = {
  items: T[];
  /** Called with every id in the new order after a drop that changed it. */
  onReorder: (ids: number[]) => void;
  /** Render one entry; place `handle` where the drag grip should sit. */
  renderItem: (item: T, handle: ReactNode, index: number) => ReactNode;
  /** Accessible name for an entry's drag handle. */
  itemLabel: (item: T) => string;
  /** `list` for a vertical column, `grid` for a wrapping card grid. */
  layout?: 'list' | 'grid';
  className?: string;
  disabled?: boolean;
};

/**
 * Drag-and-drop ordering for the content admin: drag the grip, or focus it and
 * use Space plus the arrow keys. Ordering is reported, never applied here.
 */
export function SortableArea<T extends { id: number }>({
  items,
  onReorder,
  renderItem,
  itemLabel,
  layout = 'list',
  className,
  disabled = false,
}: SortableAreaProps<T>) {
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
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
      >
        <ul className={className}>
          {items.map((item, index) => (
            <SortableEntry
              key={item.id}
              id={item.id}
              label={itemLabel(item)}
              disabled={disabled || items.length < 2}
            >
              {(handle) => renderItem(item, handle, index)}
            </SortableEntry>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableEntry({
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
      aria-label={`Drag to reorder ${label}`}
      title="Drag to reorder"
      disabled={disabled}
      className="cursor-grab touch-none rounded p-1 text-white/40 hover:bg-white/10 hover:text-white/80 active:cursor-grabbing disabled:cursor-default disabled:opacity-30"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('list-none', isDragging && 'relative z-10 opacity-90 shadow-lg')}
    >
      {children(handle)}
    </li>
  );
}
