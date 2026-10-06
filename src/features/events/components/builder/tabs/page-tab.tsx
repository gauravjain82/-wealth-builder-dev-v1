import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { ChevronDown, ExternalLink, Eye, EyeOff, GripVertical, Trash2 } from 'lucide-react';
import { Button, ErrorState, Input, Label, LoadingState, Select, Text } from '@shared/components';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { useToastStore } from '@/store';
import { cn } from '@core/utils';
import { configService } from '../../../services/config-service';
import { ADDABLE_SECTION_ORDER, SECTION_META, emptyContent } from '../../../themes/section-meta';
import { getEventTheme } from '../../../themes/registry';
import type { LandingSection, SectionType } from '../../../types/landing';
import { SectionContentEditor } from '../section-editors';
import type { TabProps } from './types';

/** A section plus a client-only key (unsaved sections have no id yet). */
interface DraftSection extends LandingSection {
  key: string;
}

let keySeq = 0;
const nextKey = () => `s${++keySeq}`;

const toDrafts = (sections: LandingSection[]): DraftSection[] =>
  sections.map((s) => ({ ...s, key: s.id ? `id${s.id}` : nextKey() }));

/**
 * Page layout tab: which sections the public landing page shows, in what
 * order, and the content of each.
 *
 * The whole layout is edited locally and saved in one request (atomic replace
 * on the backend). Until the first save the event follows its theme's default
 * layout; "Reset to theme default" returns it there.
 */
export function PageTab({ event }: TabProps) {
  const addToast = useToastStore((s) => s.addToast);
  const [sections, setSections] = useState<DraftSection[]>([]);
  const [isDefault, setIsDefault] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const layout = await configService.getLandingLayout(event.id);
      setSections(toDrafts(layout.sections));
      setIsDefault(layout.is_default);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the page layout');
    } finally {
      setLoading(false);
    }
  }, [event.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const update = (next: DraftSection[]) => {
    setSections(next);
    setDirty(true);
  };
  const patch = (key: string, changes: Partial<DraftSection>) =>
    update(sections.map((s) => (s.key === key ? { ...s, ...changes } : s)));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = sections.findIndex((s) => s.key === active.id);
    const to = sections.findIndex((s) => s.key === over.id);
    update(arrayMove(sections, from, to));
  };

  // Model-backed sections (including the inline checkout) render shared event
  // data, so each may appear once; content sections may repeat.
  const addable = useMemo(() => {
    const present = new Set(sections.map((s) => s.section_type));
    return ADDABLE_SECTION_ORDER.filter((t) => !SECTION_META[t].modelBacked || !present.has(t));
  }, [sections]);

  const addSection = (type: SectionType) => {
    const draft: DraftSection = {
      key: nextKey(),
      id: null,
      section_type: type,
      title: '',
      sort_order: sections.length,
      is_enabled: true,
      content: emptyContent(type),
    };
    update([...sections, draft]);
    setExpanded(draft.key);
  };

  const save = async () => {
    setSaving(true);
    try {
      const layout = await configService.saveLandingLayout(
        event.id,
        sections.map(({ id, section_type, title, is_enabled, content }) => ({
          id,
          section_type,
          title,
          is_enabled,
          content,
        })),
      );
      setSections(toDrafts(layout.sections));
      setIsDefault(false);
      setDirty(false);
      addToast({ type: 'success', message: 'Page layout saved' });
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setConfirmReset(false);
    setSaving(true);
    try {
      const layout = await configService.resetLandingLayout(event.id);
      setSections(toDrafts(layout.sections));
      setIsDefault(true);
      setDirty(false);
      setExpanded(null);
      addToast({ type: 'success', message: 'Page reset to the theme default' });
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Reset failed' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState description={error} />;

  const themeLabel = getEventTheme(event.theme).label;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <Text variant="muted" className="text-sm">
            Choose which sections appear on the public page and in what order. Drag to reorder, use
            the eye to hide a section without losing its content, and expand a section to edit it.
          </Text>
          <Text variant="muted" className="mt-1 text-xs">
            {isDefault
              ? `Showing the ${themeLabel} theme's default layout — save to customise it.`
              : 'This event has a customised layout.'}
          </Text>
        </div>
        {event.shortcut && (
          <a
            href={`/event/${event.shortcut}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Open public page <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="rounded-lg border border-dashed border-slate-300 px-4 py-3 text-xs text-slate-500 dark:border-white/15 dark:text-white/50">
        Hero (event name, dates, countdown, ticket button) — always first; styled by the theme.
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={sections.map((s) => s.key)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {sections.map((section) => (
              <SortableSectionRow
                key={section.key}
                section={section}
                eventId={event.id}
                expanded={expanded === section.key}
                onToggleExpand={() => setExpanded(expanded === section.key ? null : section.key)}
                onPatch={(changes) => patch(section.key, changes)}
                onRemove={() => update(sections.filter((s) => s.key !== section.key))}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label variant="form">Add a section</Label>
          <Select
            value=""
            onChange={(e) => {
              if (e.target.value) addSection(e.target.value as SectionType);
            }}
            className="min-w-[220px]"
          >
            <option value="">Choose…</option>
            {addable.map((type) => (
              <option key={type} value={type}>
                {SECTION_META[type].label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white/90 py-3 backdrop-blur dark:border-white/10 dark:bg-[#0b0d12]/90">
        <Button
          type="button"
          onClick={() => void save()}
          disabled={saving || !dirty || sections.length === 0}
        >
          {saving ? 'Saving…' : 'Save layout'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void load()}
          disabled={saving || !dirty}
        >
          Discard changes
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setConfirmReset(true)}
          disabled={saving || isDefault}
          className="ml-auto"
        >
          Reset to theme default
        </Button>
        {sections.length === 0 && (
          <Text variant="muted" className="text-xs">
            Add at least one section (or reset to the theme default).
          </Text>
        )}
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset page layout?"
        message={`This removes your custom sections and their content, and the page goes back to the ${themeLabel} theme's default layout.`}
        confirmLabel="Reset"
        confirmVariant="destructive"
        onConfirm={() => void reset()}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}

function SortableSectionRow({
  section,
  eventId,
  expanded,
  onToggleExpand,
  onPatch,
  onRemove,
}: {
  section: DraftSection;
  eventId: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onPatch: (changes: Partial<DraftSection>) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.key });
  const meta = SECTION_META[section.section_type];

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]',
        isDragging && 'relative z-10 shadow-lg',
        !section.is_enabled && 'opacity-60',
      )}
    >
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${meta.label}`}
          className="cursor-grab rounded p-1.5 text-slate-400 hover:bg-slate-100 active:cursor-grabbing dark:text-white/40 dark:hover:bg-white/10"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="truncate text-sm font-medium text-slate-900 dark:text-white">
            {section.title || meta.label}
          </span>
          {section.title && (
            <span className="truncate text-xs text-slate-500 dark:text-white/50">{meta.label}</span>
          )}
          {!section.is_enabled && (
            <span className="text-xs text-slate-500 dark:text-white/50">· hidden</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onPatch({ is_enabled: !section.is_enabled })}
          aria-label={section.is_enabled ? `Hide ${meta.label}` : `Show ${meta.label}`}
          title={section.is_enabled ? 'Hide on the public page' : 'Show on the public page'}
          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/10"
        >
          {section.is_enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${meta.label}`}
          title="Remove section"
          className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-white/60 dark:hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/10"
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
        </button>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-slate-200 p-4 dark:border-white/10">
          <Text variant="muted" className="text-xs">
            {meta.description}
            {meta.modelBacked && meta.sourceTab
              ? ` Edit the content on the ${meta.sourceTab} tab.`
              : ''}
          </Text>
          {/* The CTA band's heading lives in its own content. */}
          {section.section_type !== 'cta_band' && (
            <div className="flex flex-col gap-1.5">
              <Label variant="form">Heading</Label>
              <Input
                value={section.title}
                placeholder={meta.defaultTitle || 'No heading'}
                onChange={(e) => onPatch({ title: e.target.value })}
              />
            </div>
          )}
          {(!meta.modelBacked || meta.hasContent) && (
            <SectionContentEditor
              type={section.section_type}
              content={section.content}
              onChange={(content) => onPatch({ content })}
              eventId={eventId}
            />
          )}
        </div>
      )}
    </li>
  );
}
