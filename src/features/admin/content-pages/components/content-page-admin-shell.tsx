import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import { Block, Button, ConfirmationDialog } from '@/shared/components';
import { useToastStore } from '@/store';
import FullscreenViewer from '@/features/systematic-tools/components/fullscreen-viewer';
import type {
  ContentViewerTarget,
  OpenContentResult,
} from '@shared/services/content-page-service';
import {
  ContentItemFormModal,
  type ContentItemFormModalProps,
} from './content-item-form-modal';
import { ContentSectionFormModal } from './content-section-form-modal';
import { SortableArea } from './sortable-area';
import { describeVisibleTo } from '../utils/visible-to';
import type {
  ContentAdminApi,
  ContentFieldSchema,
  ContentItemAdmin,
  ContentSectionAdmin,
  ContentSectionFormPayload,
  FieldValue,
  RoleOption,
} from '../types';

type Nouns = {
  section: string;
  sectionPlural: string;
  item: string;
  itemPlural: string;
};

/** Opt-in tweaks to the section (tool/track/folder) form. */
type SectionFormOptions = {
  /** Hide the key input; the backend derives it from the name. */
  showKeyField?: boolean;
  nameLabel?: string;
  activeLabel?: string;
  rolePicker?: 'chips' | 'presets';
};

type ContentPageAdminShellProps<
  TSection extends ContentSectionAdmin,
  TItem extends ContentItemAdmin,
> = {
  title: string;
  description: string;
  api: ContentAdminApi<TSection, TItem>;
  nouns: Nouns;
  itemFields?: ContentFieldSchema[];
  showThumbnail?: (extras: Record<string, FieldValue>) => boolean;
  resourceTypes?: string[];
  defaultIcon?: string;
  keyPlaceholder?: string;
  labelPlaceholder?: string;
  /** Extra summary line under each item title (a type badge in card layout). */
  renderItemMeta?: (item: TItem) => ReactNode;
  /** Page-level config controls, rendered in the toolbar. */
  renderToolbar?: (reload: () => void) => ReactNode;
  /** Enables the per-item "Open" preview link. */
  openItem?: (item: TItem) => Promise<OpenContentResult>;
  /** `list` (default) = rows; `cards` = thumbnail cards like the user page. */
  itemLayout?: 'list' | 'cards';
  /** Replace the generic item form with a page-specific one taking the same props. */
  renderItemForm?: (props: ContentItemFormModalProps<TItem>) => ReactNode;
  /** Roles offered by "Visible to" pickers and used to label role badges. */
  roleOptions?: RoleOption[];
  sectionForm?: SectionFormOptions;
};

function reorderById<T extends { id: number }>(list: T[], ids: number[]): T[] {
  const byId = new Map(list.map((entry) => [entry.id, entry]));
  return ids.map((id) => byId.get(id)).filter((entry): entry is T => Boolean(entry));
}

function moveId(ids: number[], id: number, direction: -1 | 1): number[] | null {
  const index = ids.indexOf(id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ids.length) return null;
  const next = [...ids];
  next.splice(index, 1);
  next.splice(target, 0, id);
  return next;
}

function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'role' | 'muted' }) {
  const toneClass =
    tone === 'role'
      ? 'border-sky-400/30 bg-sky-400/10 text-sky-200'
      : tone === 'muted'
        ? 'border-white/20 bg-white/10 text-white/60'
        : 'border-amber-400/30 bg-amber-400/10 text-amber-200';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneClass}`}>
      {children}
    </span>
  );
}

/** Small icon button with a visible tooltip and an accessible name. */
function IconAction({
  label,
  onClick,
  disabled,
  danger,
  children,
  text,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
  text?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`inline-flex items-center gap-1 rounded-md border border-white/10 px-1.5 py-1 text-xs transition disabled:pointer-events-none disabled:opacity-30 ${
        danger
          ? 'text-red-300 hover:border-red-400/50 hover:bg-red-500/10'
          : 'text-white/70 hover:border-white/30 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
      {text && <span>{text}</span>}
    </button>
  );
}

export function ContentPageAdminShell<
  TSection extends ContentSectionAdmin,
  TItem extends ContentItemAdmin,
>({
  title,
  description,
  api,
  nouns,
  itemFields,
  showThumbnail,
  resourceTypes,
  defaultIcon,
  keyPlaceholder,
  labelPlaceholder,
  renderItemMeta,
  renderToolbar,
  openItem,
  itemLayout = 'list',
  renderItemForm,
  roleOptions,
  sectionForm,
}: ContentPageAdminShellProps<TSection, TItem>) {
  const { addToast } = useToastStore();
  const [sections, setSections] = useState<TSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const hasLoadedRef = useRef(false);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<TSection | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TItem | null>(null);
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<TSection | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<TItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewer, setViewer] = useState<ContentViewerTarget | null>(null);

  const sectionNoun = nouns.section.toLowerCase();
  const itemNoun = nouns.item.toLowerCase();
  const itemPluralNoun = nouns.itemPlural.toLowerCase();

  const activeSection = useMemo(
    () => sections.find((section) => section.id === activeSectionId) ?? null,
    [sections, activeSectionId]
  );

  const errorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  const loadData = useCallback(async () => {
    // After the first fetch, refresh in the background. Setting `loading`
    // unmounts open item modals and re-enables Save while a GCS upload is
    // still pending.
    if (!hasLoadedRef.current) setLoading(true);
    try {
      const sectionData = await api.listSections();
      setSections(sectionData);
      setActiveSectionId((current) => {
        if (current && sectionData.some((section) => section.id === current)) return current;
        return sectionData[0]?.id ?? null;
      });
      hasLoadedRef.current = true;
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : `Failed to load ${title}`,
      });
    } finally {
      setLoading(false);
    }
  }, [api, addToast, title]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSaveSection = async (payload: ContentSectionFormPayload) => {
    const { roles, section_key: sectionKey, ...rest } = payload;
    // An empty key lets the backend derive one from the name.
    const sectionPayload: Record<string, unknown> = sectionKey
      ? { ...rest, section_key: sectionKey }
      : rest;
    if (editingSection) {
      await api.updateSection(editingSection.id, sectionPayload);
      await api.updateSectionRoles(editingSection.id, roles);
      addToast({ type: 'success', message: `${nouns.section} updated` });
    } else {
      const created = await api.createSection(sectionPayload);
      await api.updateSectionRoles(created.id, roles);
      setActiveSectionId(created.id);
      addToast({ type: 'success', message: `${nouns.section} created` });
    }
    await loadData();
  };

  const handleSaveItem = async (payload: Record<string, unknown>) => {
    if (!activeSection) throw new Error(`Select a ${sectionNoun} first`);
    const { roles, id: payloadId, ...itemPayload } = payload as {
      roles: string[];
      id?: number;
    } & Record<string, unknown>;
    const existingId = typeof payloadId === 'number' ? payloadId : editingItem?.id;

    // Metadata save only. The modal uploads to GCS afterwards and toasts once
    // that finishes, so we do not refresh or close anything here.
    if (existingId) {
      const updated = await api.updateItem(existingId, itemPayload);
      await api.updateItemRoles(existingId, roles);
      return updated;
    }

    const created = await api.createItem({ ...itemPayload, section: activeSection.id });
    await api.updateItemRoles(created.id, roles);
    return created;
  };

  /** Optimistically apply a new section order; snap back if the save fails. */
  const saveSectionOrder = async (ids: number[]) => {
    const previous = sections;
    setSections(reorderById(previous, ids));
    setOrdering(true);
    try {
      await api.reorderSections(ids);
      addToast({ type: 'success', message: 'Order saved' });
    } catch (error) {
      setSections(previous);
      addToast({ type: 'error', message: errorMessage(error, 'Could not save the new order') });
    } finally {
      setOrdering(false);
    }
  };

  /** Optimistically apply a new item order inside one section. */
  const saveItemOrder = async (sectionId: number, ids: number[]) => {
    const previous = sections;
    setSections(
      previous.map((section) =>
        section.id === sectionId
          ? { ...section, items: reorderById(section.items, ids) }
          : section
      )
    );
    setOrdering(true);
    try {
      await api.reorderItems(ids, sectionId);
      addToast({ type: 'success', message: 'Order saved' });
    } catch (error) {
      setSections(previous);
      addToast({ type: 'error', message: errorMessage(error, 'Could not save the new order') });
    } finally {
      setOrdering(false);
    }
  };

  const moveSection = (sectionId: number, direction: -1 | 1) => {
    const ids = moveId(
      sections.map((section) => section.id),
      sectionId,
      direction
    );
    if (ids) void saveSectionOrder(ids);
  };

  const moveItem = (itemId: number, direction: -1 | 1) => {
    if (!activeSection) return;
    const ids = moveId(
      activeSection.items.map((item) => item.id),
      itemId,
      direction
    );
    if (ids) void saveItemOrder(activeSection.id, ids);
  };

  const toggleSectionVisibility = async (section: TSection) => {
    try {
      await api.updateSection(section.id, { is_active: !section.is_active });
      addToast({
        type: 'success',
        message: `${nouns.section} ${section.is_active ? 'hidden' : 'shown on the page'}`,
      });
      await loadData();
    } catch (error) {
      addToast({ type: 'error', message: errorMessage(error, 'Could not change visibility') });
    }
  };

  const toggleItemVisibility = async (item: TItem) => {
    try {
      await api.updateItem(item.id, { is_active: !item.is_active });
      addToast({
        type: 'success',
        message: `${nouns.item} ${item.is_active ? 'hidden' : 'shown on the page'}`,
      });
      await loadData();
    } catch (error) {
      addToast({ type: 'error', message: errorMessage(error, 'Could not change visibility') });
    }
  };

  const handleOpenItem = async (item: TItem) => {
    if (!openItem) return;
    const result = await openItem(item);
    if ('viewer' in result) {
      setViewer(result.viewer);
      return;
    }
    if ('failed' in result) {
      addToast({ type: 'error', message: 'Unable to open this file.' });
    }
  };

  const confirmDelete = async (action: () => Promise<void>, successMessage: string) => {
    setDeleting(true);
    try {
      await action();
      addToast({ type: 'success', message: successMessage });
      await loadData();
    } catch (error) {
      addToast({ type: 'error', message: errorMessage(error, 'Delete failed') });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-white/60">
        Loading {title}...
      </div>
    );
  }

  const items = (activeSection?.items ?? []) as TItem[];
  const visibleTo = (roles: string[]) => describeVisibleTo(roles, roleOptions);
  const canOpen = (item: TItem) => Boolean(openItem && (item.gcs_blob_name || item.resolved_href));

  const itemActions = (item: TItem, index: number) => (
    <>
      <IconAction
        label="Move earlier"
        disabled={ordering || index === 0}
        onClick={() => moveItem(item.id, -1)}
      >
        {itemLayout === 'cards' ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
      </IconAction>
      <IconAction
        label="Move later"
        disabled={ordering || index === items.length - 1}
        onClick={() => moveItem(item.id, 1)}
      >
        {itemLayout === 'cards' ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
      </IconAction>
      <IconAction
        label={`Edit ${item.title}`}
        text="Edit"
        onClick={() => {
          setEditingItem(item);
          setItemModalOpen(true);
        }}
      >
        <Pencil className="h-3.5 w-3.5" />
      </IconAction>
      <IconAction
        label={item.is_active ? `Hide ${item.title} from the page` : `Show ${item.title} on the page`}
        text={item.is_active ? 'Hide' : 'Show'}
        onClick={() => void toggleItemVisibility(item)}
      >
        {item.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </IconAction>
      <IconAction label={`Delete ${item.title}`} danger onClick={() => setDeleteItemTarget(item)}>
        <Trash2 className="h-3.5 w-3.5" />
      </IconAction>
    </>
  );

  const renderItemRow = (item: TItem, handle: ReactNode, index: number) => (
    <div
      className={`flex flex-col gap-3 rounded-xl border border-white/10 p-4 md:flex-row md:items-center ${
        item.is_active ? '' : 'opacity-60'
      }`}
    >
      <div className="flex flex-1 items-start gap-2">
        {handle}
        <div className="flex-1">
          <p className="font-medium text-white">{item.title}</p>
          <p className="text-xs text-white/50">
            {renderItemMeta ? renderItemMeta(item) : item.resource_type}
            {` · Visible to: ${visibleTo(item.allowed_roles)}`}
            {item.is_active ? '' : ' · hidden'}
          </p>
          {canOpen(item) ? (
            <button
              type="button"
              className="text-xs text-amber-300 hover:underline"
              onClick={() => void handleOpenItem(item)}
            >
              Open
            </button>
          ) : null}
        </div>
      </div>
      {item.resolved_thumb && (
        <img src={item.resolved_thumb} alt={item.title} className="h-16 w-24 rounded object-cover" />
      )}
      <div className="flex flex-wrap gap-1">{itemActions(item, index)}</div>
    </div>
  );

  const renderItemCard = (item: TItem, handle: ReactNode, index: number) => (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-xl border bg-black/20 ${
        item.is_active ? 'border-white/10' : 'border-dashed border-white/20 opacity-60'
      }`}
    >
      <div className="relative aspect-video bg-white/5">
        {item.resolved_thumb ? (
          <img
            src={item.resolved_thumb}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-white/40">
            No thumbnail
          </div>
        )}
        <div className="absolute left-1.5 top-1.5 rounded-md bg-black/70">{handle}</div>
        {!item.is_active && (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
            Hidden
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-2 text-sm font-medium text-white" title={item.title}>
          {item.title}
        </p>
        <div className="flex flex-wrap gap-1">
          <Badge>{renderItemMeta ? renderItemMeta(item) : item.resource_type}</Badge>
          <Badge tone="role">Visible to: {visibleTo(item.allowed_roles)}</Badge>
          {!item.is_active && <Badge tone="muted">Hidden</Badge>}
        </div>
        {canOpen(item) ? (
          <button
            type="button"
            className="self-start text-xs text-amber-300 hover:underline"
            onClick={() => void handleOpenItem(item)}
          >
            Open
          </button>
        ) : null}
        <div className="mt-auto flex flex-wrap gap-1 pt-1">{itemActions(item, index)}</div>
      </div>
    </div>
  );

  const itemFormProps: ContentItemFormModalProps<TItem> | null = activeSection
    ? {
        open: itemModalOpen,
        sectionId: activeSection.id,
        item: editingItem,
        onClose: () => setItemModalOpen(false),
        onSave: handleSaveItem as ContentItemFormModalProps<TItem>['onSave'],
        uploadFile: api.uploadItemFile,
        onRefresh: () => void loadData(),
        onSaved: (_saved, action) => {
          addToast({ type: 'success', message: `${nouns.item} ${action}` });
        },
        fields: itemFields,
        showThumbnail,
        resourceTypes,
        nounSingular: itemNoun,
      }
    : null;

  const deleteSectionItemCount = deleteSectionTarget?.items.length ?? 0;

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <Block title={title} description={description} titleVariant="h5" className="flex-shrink-0" />

      <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
        {renderToolbar?.(() => void loadData())}
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setEditingSection(null);
            setSectionModalOpen(true);
          }}
        >
          Add {sectionNoun}
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1d25] p-3">
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-white/50">
            {nouns.sectionPlural}
          </h3>
          <p className="mb-3 text-xs text-white/40">Drag ⋮⋮ to change the order.</p>
          <SortableArea
            items={sections}
            layout="list"
            disabled={ordering}
            className="space-y-2"
            itemLabel={(section) => section.label}
            onReorder={(ids) => void saveSectionOrder(ids)}
            renderItem={(section, handle, index) => {
              const isActive = section.id === activeSectionId;
              return (
                <div
                  className={`rounded-xl border p-2 ${
                    isActive ? 'border-amber-400/60 bg-amber-400/10' : 'border-white/10'
                  } ${section.is_active ? '' : 'opacity-70'}`}
                >
                  <div className="flex items-start gap-1">
                    {handle}
                    <button
                      type="button"
                      className="flex flex-1 items-start gap-2 py-1 text-left"
                      onClick={() => setActiveSectionId(section.id)}
                      aria-current={isActive ? 'true' : undefined}
                    >
                      <span className="w-5 text-right text-xs text-white/40">{index + 1}</span>
                      <span>{section.icon}</span>
                      <span className="flex-1">
                        <span className="block text-sm text-white">{section.label}</span>
                        <span className="block text-[11px] text-white/45">
                          {section.items.length}{' '}
                          {section.items.length === 1 ? itemNoun : itemPluralNoun} · Visible to:{' '}
                          {visibleTo(section.allowed_roles)}
                        </span>
                      </span>
                      {!section.is_active && <Badge tone="muted">Hidden</Badge>}
                    </button>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1 pl-7">
                    <IconAction
                      label="Move up"
                      disabled={ordering || index === 0}
                      onClick={() => moveSection(section.id, -1)}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </IconAction>
                    <IconAction
                      label="Move down"
                      disabled={ordering || index === sections.length - 1}
                      onClick={() => moveSection(section.id, 1)}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </IconAction>
                    <IconAction
                      label={`Edit ${section.label}`}
                      text="Edit"
                      onClick={() => {
                        setEditingSection(section);
                        setSectionModalOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </IconAction>
                    <IconAction
                      label={
                        section.is_active
                          ? `Hide ${section.label} from the page`
                          : `Show ${section.label} on the page`
                      }
                      text={section.is_active ? 'Hide' : 'Show'}
                      onClick={() => void toggleSectionVisibility(section)}
                    >
                      {section.is_active ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </IconAction>
                    <IconAction
                      label={`Delete ${section.label}`}
                      danger
                      onClick={() => setDeleteSectionTarget(section)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconAction>
                  </div>
                </div>
              );
            }}
          />
          {sections.length === 0 && (
            <p className="py-6 text-center text-sm text-white/50">
              No {nouns.sectionPlural.toLowerCase()} yet.
            </p>
          )}
        </aside>

        <section className="min-h-0 overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1d25] p-4">
          {activeSection ? (
            <>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                    <span>{activeSection.icon}</span>
                    {activeSection.label}
                    {!activeSection.is_active && <Badge tone="muted">Hidden</Badge>}
                  </h3>
                  <p className="text-sm text-white/50">
                    {items.length} {items.length === 1 ? itemNoun : itemPluralNoun} · Visible to:{' '}
                    {visibleTo(activeSection.allowed_roles)}
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    {nouns.itemPlural} are only visible when this {sectionNoun} is visible too.
                    {items.length > 1 ? ' Drag ⋮⋮ to change the order.' : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setEditingItem(null);
                    setItemModalOpen(true);
                  }}
                >
                  Add {itemNoun}
                </Button>
              </div>

              <SortableArea
                key={activeSection.id}
                items={items}
                layout={itemLayout === 'cards' ? 'grid' : 'list'}
                disabled={ordering}
                className={
                  itemLayout === 'cards'
                    ? 'grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]'
                    : 'space-y-3'
                }
                itemLabel={(item) => item.title}
                onReorder={(ids) => void saveItemOrder(activeSection.id, ids)}
                renderItem={itemLayout === 'cards' ? renderItemCard : renderItemRow}
              />
              {items.length === 0 && (
                <p className="py-8 text-center text-sm text-white/50">
                  No {itemPluralNoun} in this {sectionNoun} yet.
                </p>
              )}
            </>
          ) : (
            <p className="py-8 text-center text-sm text-white/50">
              Create a {sectionNoun} to start adding {itemPluralNoun}.
            </p>
          )}
        </section>
      </div>

      <ContentSectionFormModal
        open={sectionModalOpen}
        section={editingSection}
        onClose={() => setSectionModalOpen(false)}
        onSave={handleSaveSection}
        nounSingular={sectionNoun}
        defaultIcon={defaultIcon}
        keyPlaceholder={keyPlaceholder}
        labelPlaceholder={labelPlaceholder}
        showKeyField={sectionForm?.showKeyField}
        nameLabel={sectionForm?.nameLabel}
        activeLabel={sectionForm?.activeLabel}
        rolePicker={sectionForm?.rolePicker}
        roleOptions={roleOptions}
      />

      {itemFormProps &&
        (renderItemForm ? (
          renderItemForm(itemFormProps)
        ) : (
          <ContentItemFormModal<TItem> {...itemFormProps} />
        ))}

      <ConfirmationDialog
        open={Boolean(deleteSectionTarget)}
        title={`Delete "${deleteSectionTarget?.label ?? ''}"?`}
        message={
          deleteSectionItemCount > 0
            ? `This permanently deletes the ${sectionNoun} and the ${deleteSectionItemCount} ${
                deleteSectionItemCount === 1 ? itemNoun : itemPluralNoun
              } inside it. To keep them, use Hide instead.`
            : `This permanently deletes the ${sectionNoun}. It has no ${itemPluralNoun}.`
        }
        confirmText={
          deleteSectionItemCount > 0
            ? `Delete ${sectionNoun} and ${deleteSectionItemCount} ${
                deleteSectionItemCount === 1 ? itemNoun : itemPluralNoun
              }`
            : 'Delete'
        }
        loading={deleting}
        onConfirm={async () => {
          const target = deleteSectionTarget;
          if (!target) return;
          await confirmDelete(() => api.deleteSection(target.id), `${nouns.section} deleted`);
          setDeleteSectionTarget(null);
        }}
        onClose={() => setDeleteSectionTarget(null)}
      />

      <ConfirmationDialog
        open={Boolean(deleteItemTarget)}
        title={`Delete "${deleteItemTarget?.title ?? ''}"?`}
        message={`This ${itemNoun} is removed permanently. To keep it, use Hide instead.`}
        confirmText="Delete"
        loading={deleting}
        onConfirm={async () => {
          const target = deleteItemTarget;
          if (!target) return;
          await confirmDelete(() => api.deleteItem(target.id), `${nouns.item} deleted`);
          setDeleteItemTarget(null);
        }}
        onClose={() => setDeleteItemTarget(null)}
      />

      <FullscreenViewer
        isOpen={Boolean(viewer)}
        src={viewer?.src ?? ''}
        title={viewer?.title ?? ''}
        allowDownload={viewer?.allowDownload}
        httpHeaders={viewer?.httpHeaders}
        forcePdf={viewer?.forcePdf}
        onClose={() => setViewer(null)}
      />
    </div>
  );
}
